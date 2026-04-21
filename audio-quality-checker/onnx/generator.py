# Generates the .onnx model for the audio quality checker.

import torch
from speechbrain.inference import EncoderClassifier

class EmbeddingWrapper(torch.nn.Module):
    def __init__(self, encoder):
        super().__init__()
        self.encoder = encoder

    def forward(self, waveform: torch.Tensor) -> torch.Tensor:
        return self.encoder.encode_batch(waveform).squeeze(1)


model = EncoderClassifier.from_hparams(
    source="speechbrain/spkrec-ecapa-voxceleb",
    savedir="pretrained_ecapa"
)
model.eval()

wrapper = EmbeddingWrapper(model)
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
    opset_version=14
)