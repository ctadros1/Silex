// Silex's small UDPipe adapter. UDPipe itself is MPL-2.0.
// Only trained sentence/token segmentation runs here, not dependency parsing.
#include "udpipe.h"
#include <emscripten/bind.h>
#include <sstream>
using namespace ufal::udpipe;
static model* current_model = nullptr;
bool initModel(const std::string& path) {
  delete current_model;
  current_model = model::load(path.c_str());
  return current_model != nullptr;
}
std::string segmentDocument(const std::string& text) {
  if (!current_model) throw std::runtime_error("Document tokenizer is not loaded.");
  pipeline pipe(current_model, "tokenizer=ranges", pipeline::NONE, pipeline::NONE, "conllu");
  std::istringstream input(text);
  std::ostringstream output;
  std::string error;
  if (!pipe.process(input, output, error)) throw std::runtime_error(error);
  return output.str();
}
EMSCRIPTEN_BINDINGS(silex_document_tokenizer) {
  emscripten::function("initModel", &initModel);
  emscripten::function("segmentDocument", &segmentDocument);
}
