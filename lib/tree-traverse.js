exports.inorder = inorder;
exports.preorder = preorder;
exports.postorder = postorder;

function inorder(T) {
  var A = [];
  var p = T;
  var nodes = [];

  while (p || A.length) {
    while (p) {
      A.push(p);
      p = p.left;
    }
    p = A.pop();
    // visit p
    nodes.push(p);
    p = p.right;
  }

  return nodes;
}

function preorder(T) {
  var A = [];
  var p = T;
  var nodes = [];

  while (p || A.length) {
    while (p) {
      nodes.push(p);
      A.push(p);
      p = p.left;
    }
    p = A.pop();
    p = p.right;
  }

  return nodes;
}

function postorder(T) {
  var A = [];
  var p = T;
  var nodes = [];
  // the last visited node
  var q;

  while (p || A.length) {
    while (p) {
      A.push(p);
      p = p.left;
    }
    p = A.pop();
    if (p.right && p.right !== q) {
      A.push(p);
      p = p.right;
    } else {
      nodes.push(p);
      q = p;
      p = null;
    }
  }

  return nodes;
}

