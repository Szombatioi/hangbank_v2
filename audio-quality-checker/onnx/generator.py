# Generates the .onnx model for the audio quality checker.

# SpeechBrain lazily imports `speechbrain.integrations.k2_fsa`, which does `import k2`
# at load. torch's ONNX/dynamo exporter walks sys.modules (probing each module's
# __file__) while registering custom ops, which triggers that import — and k2 has no
# Windows/Python-3.14 wheel, so it crashes the export. We don't use k2, so stub it with
# an empty module: `import k2` then succeeds and the lazy probe becomes a harmless no-op.
import sys, types
sys.modules.setdefault("k2", types.ModuleType("k2"))

import torch
import torch.onnx

from speechbrain.inference import EncoderClassifier
from speechbrain.utils.fetching import LocalStrategy

class EmbeddingWrapper(torch.nn.Module):
    def __init__(self, encoder):
        super().__init__()
        self.encoder = encoder

    def forward(self, waveform: torch.Tensor) -> torch.Tensor:
        return self.encoder.encode_batch(waveform).squeeze(1)


model = EncoderClassifier.from_hparams(
    source="speechbrain/spkrec-ecapa-voxceleb",
    savedir="pretrained_ecapa",
    # Windows blocks symlinks without admin/Developer Mode, so copy files instead
    local_strategy=LocalStrategy.COPY,
)
model.eval()

wrapper = EmbeddingWrapper(model)
wrapper.eval()  # ensure BatchNorm/dropout use inference behavior in the exported graph
dummy_input = torch.randn(1, 16000)

torch.onnx.export(
    wrapper,
    dummy_input,
    "ecapa_tdnn.onnx",
    input_names=["waveform"],
    output_names=["embedding"],
    dynamic_axes={
        "waveform":  {0: "batch", 1: "samples"},
        "embedding": {0: "batch"}
    },
    # opset >= 17 is required: the feature frontend uses aten::stft, which ONNX only
    # supports from opset 17 onward.
    opset_version=17,
    # Legacy TorchScript exporter. The new dynamo exporter imports torch._dynamo /
    # torch.export, whose op registration walks sys.modules and detonates SpeechBrain's
    # lazy optional-integration imports (k2, transformers, ...). The legacy path avoids
    # all of that and is the well-trodden route for exporting ECAPA-TDNN to ONNX.
    dynamo=False,
)