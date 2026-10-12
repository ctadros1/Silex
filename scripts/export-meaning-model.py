"""Convert amrlib's frozen BART-base meaning parser for local browser inference.

Input: the author's model_parse_xfm_bart_base-v0_1_0 release, exported with
Optimum's text2text-generation-with-past task. No Silex examples or fine-tuning
are used. Model assets are separate from the converter source distribution.
"""
import argparse
import hashlib
import json
from pathlib import Path
import shutil

from onnxruntime.quantization import quantize_dynamic, QuantType

parser = argparse.ArgumentParser()
parser.add_argument('input', type=Path)
parser.add_argument('output', type=Path)
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
onnx_dir = args.output / 'onnx'
onnx_dir.mkdir(exist_ok=True)
for name in ['encoder_model', 'decoder_model_merged']:
    quantize_dynamic(str(args.input / (name + '.onnx')),
                     str(onnx_dir / (name + '_quantized.onnx')),
                     weight_type=QuantType.QUInt8,
                     op_types_to_quantize=['MatMul', 'Gather'],
                     extra_options={'EnableSubgraph': True})
for name in ['config.json', 'generation_config.json', 'tokenizer.json',
             'tokenizer_config.json', 'special_tokens_map.json', 'vocab.json', 'merges.txt']:
    source = args.input / name
    if source.exists():
        shutil.copyfile(source, args.output / name)
config = json.loads((args.output / 'config.json').read_text())
config.pop('task_specific_params', None)
config['_name_or_path'] = 'amrlib/parse_xfm_bart_base-v0_1_0'
(args.output / 'config.json').write_text(json.dumps(config, indent=2) + '\n')
generation = json.loads((args.output / 'generation_config.json').read_text())
generation.update(num_beams=1, do_sample=False, no_repeat_ngram_size=0,
                  early_stopping=False, max_length=1024)
(args.output / 'generation_config.json').write_text(json.dumps(generation, indent=2) + '\n')
files = {}
for file in sorted(args.output.rglob('*')):
    if file.is_file() and file.name != 'checksums.json':
        data = file.read_bytes()
        files[str(file.relative_to(args.output))] = {
            'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
(args.output / 'checksums.json').write_text(json.dumps(files, indent=2) + '\n')
print(json.dumps(files, indent=2))
