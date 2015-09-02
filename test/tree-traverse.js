var test = require('tap').test;
var treeify = require('treeify');
var traverse = require('../lib/tree-traverse');
var inorder = traverse.inorder;
var preorder = traverse.preorder;
var postorder = traverse.postorder;

var A = { id: 'A' };
var B = { id: 'B' };
var C = { id: 'C' };
var D = { id: 'D' };
var E = { id: 'E' };
var F = { id: 'F' };
var G = { id: 'G' };
var H = { id: 'H' };
var J = { id: 'J' };

A.left = B;
A.right = C;
B.left = D;
C.left = E;
C.right = F;
E.right = G;
F.left = H;
F.right = J;

console.log('='.repeat(80));
console.log('ROOT');
console.log(treeify.asTree(A, true));
console.log('='.repeat(80));

test('inorder', runTest.bind(null, inorder, recursiveInorder));
test('preorder', runTest.bind(null, preorder, recursivePreorder));
test('postorder', runTest.bind(null, postorder, recursivePostorder));

function runTest(actual, expect, t) {
  [A, B, C, D, E, F, G, H, J].forEach(function (root) {
    t.same(
      identify(actual(root)),
      identify(expect(root)),
      root
    );
  });
  t.end();
}

function recursivePostorder(T, nodes) {
  if (!T) {
    return nodes;
  }
  nodes = nodes || [];
  recursivePostorder(T.left, nodes);
  recursivePostorder(T.right, nodes);
  nodes.push(T);
  return nodes;
}

function recursivePreorder(T, nodes) {
  if (!T) {
    return nodes;
  }
  nodes = nodes || [];
  nodes.push(T);
  recursivePreorder(T.left, nodes);
  recursivePreorder(T.right, nodes);
  return nodes;
}

function recursiveInorder(T, nodes) {
  if (!T) {
    return nodes;
  }
  nodes = nodes || [];
  recursiveInorder(T.left, nodes);
  nodes.push(T);
  recursiveInorder(T.right, nodes);
  return nodes;
}

function identify(nodes) {
  return nodes.map(function (node) {
    return node.id;
  });
}

