# Generates onnx/ecapa_tdnn.onnx — the speaker-embedding model used by SpeakerCheck.
#
# SpeakerCheck (src/strategy/speaker_check.ts) runs the model as:
#     session.run({ waveform: tensor })   // tensor: float32, shape [1, N], 16 kHz mono
#     output['embedding'].data            // 192-dim speaker embedding
#
# So the exported graph must have exactly one input named "waveform" ([batch, samples])
# and one output named "embedding" ([batch, 192]).
#
# This file bakes in every workaround needed to export ECAPA-TDNN on a modern
# Windows + new-PyTorch setup — see the inline notes.

import os
import sys
import math
import types

# --- Workaround 1: SpeechBrain optional integrations ----------------------------
# SpeechBrain lazily registers `speechbrain.integrations.k2_fsa`, which does
# `import k2` on first attribute access. PyTorch's exporter walks sys.modules
# (probing every module's __file__) while registering custom ops, which triggers
# that import — and k2 has no Windows/Python-3.14 wheel, crashing the export.
# We don't use k2, so stub it: `import k2` then succeeds harmlessly.
sys.modules.setdefault("k2", types.ModuleType("k2"))

import torch
import torch.nn.functional as F
# Import torch.onnx up front so its custom-op registration runs before SpeechBrain's
# lazy proxies exist in sys.modules.
import torch.onnx

from speechbrain.inference import EncoderClassifier
from speechbrain.utils.fetching import LocalStrategy
from speechbrain.processing.features import STFT

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
# NOTE: do NOT use onnx/pretrained_ecapa — that folder contains stale macOS symlink
# placeholder files committed to the repo (tiny text files holding a /Users/... path),
# which SpeechBrain would read as a corrupt hyperparams.yaml. Use the project-root
# cache, which holds the real downloaded files (and is fetched there if missing).
SAVEDIR = os.path.join(SCRIPT_DIR, "..", "pretrained_ecapa")
OUTPUT_PATH = os.path.join(SCRIPT_DIR, "ecapa_tdnn.onnx")  # -> ./onnx/ecapa_tdnn.onnx


class OnnxSTFT(torch.nn.Module):
    """Drop-in replacement for SpeechBrain's STFT that is ONNX-exportable.

    PyTorch's ONNX exporter cannot lower `torch.stft` when it returns a complex
    tensor (which it now always does). We instead compute the STFT as a Conv1d
    against a windowed real/imaginary DFT basis — pure Conv/Pad/Transpose ops —
    producing the same [batch, frames, freq, 2] tensor for 2-D (mono) input.
    """

    def __init__(self, ref: STFT):
        super().__init__()
        self.n_fft = ref.n_fft
        self.hop_length = ref.hop_length
        self.win_length = ref.win_length
        self.center = ref.center
        self.pad_mode = ref.pad_mode
        self.normalized = ref.normalized_stft
        self.onesided = ref.onesided

        n_fft = self.n_fft
        num_freqs = n_fft // 2 + 1 if self.onesided else n_fft

        # Window of length win_length, zero-padded (centered) to n_fft if needed.
        window = ref.window.detach().clone().float()
        if self.win_length < n_fft:
            left = (n_fft - self.win_length) // 2
            window = F.pad(window, (left, n_fft - self.win_length - left))

        n = torch.arange(n_fft, dtype=torch.float32)
        k = torch.arange(num_freqs, dtype=torch.float32).unsqueeze(1)  # [F, 1]
        angle = (2.0 * math.pi / n_fft) * k * n.unsqueeze(0)           # [F, n_fft]
        cos_k = torch.cos(angle) * window                              # real part
        sin_k = -torch.sin(angle) * window                            # imag part
        if self.normalized:
            scale = n_fft ** -0.5
            cos_k, sin_k = cos_k * scale, sin_k * scale

        # Conv1d weights: [out_channels=F, in_channels=1, kernel=n_fft]
        self.register_buffer("real_weight", cos_k.unsqueeze(1))
        self.register_buffer("imag_weight", sin_k.unsqueeze(1))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: [batch, time]
        if self.center:
            x = F.pad(x, (self.n_fft // 2, self.n_fft // 2), mode=self.pad_mode)
        x = x.unsqueeze(1)  # [batch, 1, time]
        real = F.conv1d(x, self.real_weight, stride=self.hop_length)  # [batch, F, frames]
        imag = F.conv1d(x, self.imag_weight, stride=self.hop_length)
        real = real.transpose(1, 2)  # [batch, frames, F]
        imag = imag.transpose(1, 2)
        return torch.stack([real, imag], dim=-1)  # [batch, frames, F, 2]


def patch_stft_modules(model: torch.nn.Module) -> int:
    """Replaces every SpeechBrain STFT submodule with the ONNX-friendly version."""
    to_replace = []
    for module in model.modules():
        for name, child in module.named_children():
            if isinstance(child, STFT):
                to_replace.append((module, name, child))
    for module, name, child in to_replace:
        setattr(module, name, OnnxSTFT(child))
    return len(to_replace)


class EmbeddingWrapper(torch.nn.Module):
    """Maps a raw waveform straight to a 192-dim speaker embedding.

    `encode_batch` does the whole pipeline: log-mel features -> normalization ->
    ECAPA-TDNN -> [batch, 1, 192]. We squeeze the singleton axis so the output is
    [batch, 192], which is what SpeakerCheck reads as `embedding`.
    """

    def __init__(self, classifier: EncoderClassifier):
        super().__init__()
        self.classifier = classifier

    def forward(self, waveform: torch.Tensor) -> torch.Tensor:
        # waveform: [batch, samples], float32, 16 kHz mono.
        # Relative lengths are all 1.0 — SpeakerCheck always feeds full-length clips.
        # Deriving this from the waveform keeps the graph to a single runtime input.
        wav_lens = torch.ones(waveform.shape[0], device=waveform.device)
        embeddings = self.classifier.encode_batch(waveform, wav_lens)  # [batch, 1, 192]
        return embeddings.squeeze(1)  # [batch, 192]


def main() -> None:
    classifier = EncoderClassifier.from_hparams(
        source="speechbrain/spkrec-ecapa-voxceleb",
        savedir=SAVEDIR,
        # Windows blocks symlinks without admin/Developer Mode, so copy files instead.
        local_strategy=LocalStrategy.COPY,
    )
    classifier.eval()

    n_patched = patch_stft_modules(classifier)
    print(f"Patched {n_patched} STFT module(s) for ONNX export")

    wrapper = EmbeddingWrapper(classifier)
    wrapper.eval()  # inference behavior for BatchNorm/dropout in the exported graph

    # Sanity check the patched model still produces a 192-dim embedding.
    with torch.no_grad():
        probe = wrapper(torch.randn(1, 16000))
    assert probe.shape == (1, 192), f"unexpected embedding shape {tuple(probe.shape)}"

    torch.onnx.export(
        wrapper,
        torch.randn(1, 16000),  # 1 s of 16 kHz audio; time axis made dynamic below
        OUTPUT_PATH,
        input_names=["waveform"],
        output_names=["embedding"],
        dynamic_axes={
            "waveform": {0: "batch", 1: "samples"},
            "embedding": {0: "batch"},
        },
        opset_version=17,
        # Legacy TorchScript exporter — the dynamo exporter re-detonates SpeechBrain's
        # lazy optional-integration imports while walking sys.modules.
        dynamo=False,
    )

    print(f"Exported speaker-embedding model -> {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
