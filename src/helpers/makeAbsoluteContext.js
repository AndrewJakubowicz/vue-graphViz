
const makeAbsoluteContext = (element, documentNode) => {
  return function(x,y) {
    var offset = documentNode.getBoundingClientRect();
    var matrix = element.getScreenCTM();
    return {
      x: (matrix.a * x) + (matrix.c * y) + matrix.e - offset.left,
      y: (matrix.b * x) + (matrix.d * y) + matrix.f - offset.top
    };
  };
}

module.exports = makeAbsoluteContext;