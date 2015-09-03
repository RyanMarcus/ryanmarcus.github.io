require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright 2015 Ryan Marcus
// This file is part of vulcan.
// 
// vulcan is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// 
// vulcan is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
// 
// You should have received a copy of the GNU Affero General Public License
// along with vulcan.  If not, see <http://www.gnu.org/licenses/>.

var util = require("./util.js");


function buildConjunction(a, b) {
	return { action: "conjunction",
		 args: [a, b] };
}

function buildImplication(a, b) {
	return { action: "implication",
		 args: [a, b] };
}

function buildNegation(a) {
	return { action: "negation",
		 args: [a] };
}

function buildDisjunction(a, b) {
	return { action: "disjunction",
		 args: [a, b] };
}

function eliminateBijection(tree) {

	if (!tree || tree.action == "substitution" || tree.action == "literal")
		return tree;

	if (tree.action == "equivalence") {
		// apply the transformation
		return buildConjunction(
			buildImplication(
				eliminateBijection(tree.args[0]),
				eliminateBijection(tree.args[1])
			),
			buildImplication(
				eliminateBijection(tree.args[1]),
				eliminateBijection(tree.args[0])
			));

			 
	}

	return { action: tree.action,
		 args: tree.args.map(eliminateBijection) };
}

function deMorgans(tree) {
	if (!tree || tree.action == "substitution" || tree.action == "literal")
		return tree;
	
	if (tree.action == "negation") {
		if (tree.args[0].action == "disjunction") {
			// move the negation in
			return deMorgans(buildConjunction(
				buildNegation(tree.args[0].args[0]),
				buildNegation(tree.args[0].args[1])
			));
		}

		if (tree.args[0].action == "conjunction") {
			// move negation in
			return deMorgans(buildDisjunction(
				buildNegation(tree.args[0].args[0]),
				buildNegation(tree.args[0].args[1])
			));
		}
	}

	return { action: tree.action,
		 args: tree.args.map(deMorgans) };
}

function eliminateImplication(tree) {
	
	if (!tree || tree.action == "substitution" || tree.action == "literal")
		return tree;


	if (tree.action == "implication") {
		return buildDisjunction(
			buildNegation(eliminateImplication(tree.args[0])),
			eliminateImplication(tree.args[1]));
	}

	return { action: tree.action,
		 args: tree.args.map(eliminateImplication) };
 
}

function eliminateDoubleNegation(tree) {
	if (!tree || tree.action == "substitution" || tree.action == "literal")
		return tree;


	if (tree.action == "negation") {
		if (tree.args[0].action == "negation") {
			return eliminateDoubleNegation(tree.args[0].args[0]);
		}
	}

	return { action: tree.action,
		 args: tree.args.map(eliminateDoubleNegation) };
}

function clone(obj) {
	return JSON.parse(JSON.stringify(obj));
}

function distribOr(tree) {
	if (!tree || tree.action == "substitution" || tree.action == "literal")
		return tree;


	if (tree.action == "disjunction") {
		if (tree.args[1].action == "conjunction") {
			return distribOr(buildConjunction(
				buildDisjunction(clone(tree.args[0]),
						 clone(tree.args[1].args[0])),
				buildDisjunction(clone(tree.args[0]),
						 clone(tree.args[1].args[1]))
			));
			
						 
		}

		if (tree.args[0].action == "conjunction") {
			return distribOr(buildConjunction(
				buildDisjunction(clone(tree.args[1]),
						 clone(tree.args[0].args[0])),
				buildDisjunction(clone(tree.args[1]),
						 clone(tree.args[0].args[1]))
			));
			
						 
		}
	}


	return { action: tree.action,
		 args: tree.args.map(distribOr) };




}

function doComplementation(tree) {
	if (!tree || tree.action == "substitution" || tree.action == "literal")
		return tree;
	
	if (tree.action == "disjunction") {
		var lc = tree.args[0];
		var rc = tree.args[1];

		if (lc.action == "negation") {
			if (util.treeToExpr(lc.args[0]) == util.treeToExpr(rc)) {
				return {action: "literal",
					args: [true]};
			}
		}


		if (rc.action == "negation") {
			if (util.treeToExpr(rc.args[0]) == util.treeToExpr(lc)) {
				return {action: "literal",
					args: [true]};
			}
		}
	}

	if (tree.action == "conjunction") {
		var lc = tree.args[0];
		var rc = tree.args[1];

		if (lc.args[0].action == "negation") {
			if (util.treeToExpr(lc.args[0].args[0]) == util.treeToExpr(rc)) {
				return {action: "literal",
					args: [false]};
			}
		}


		if (rc.args[0].action == "negation") {
			if (util.treeToExpr(rc.args[0].args[0]) == util.treeToExpr(lc)) {
				return {action: "literal",
					args: [false]};
			}
		}
	}


	return { action: tree.action,
		 args: tree.args.map(doComplementation) };
}


function doIdentity(tree) {
	if (!tree || tree.action == "substitution" || tree.action == "literal")
		return tree;

	if (tree.action == "disjunction") {
		var lc = tree.args[0];
		var rc = tree.args[1];

		if (lc.action == "literal") {
			if (lc.args[0] == true) {
				return lc;
			} else if (lc.args[0] == false) {
				return rc;
			}
		}

		if (rc.action == "literal") {
			if (rc.args[0] == true) {
				return rc;
			} else if (rc.args[0] == false) {
				return lc;
			}
		}
	}

	if (tree.action == "conjunction") {
		var lc = tree.args[0];
		var rc = tree.args[1];
		
		if (lc.action == "literal") {
			if (lc.args[0] == true) {
				return rc;
			} else if (lc.args[0] == false) {
				return lc;
			}
		}
		
		if (rc.action == "literal") {
			if (rc.args[0] == true) {
				return lc;
			} else if (rc.args[0] == false) {
				return rc;
			}
		}
	}

	return {action: tree.action,
		args: tree.args.map(doIdentity)};



}




module.exports.convertToCNF = convertToCNF;
function convertToCNF(tree) {
	var actions = [{task: "eliminate bijection", f: eliminateBijection},
		       {task: "eliminate implication", f: eliminateImplication},
		       {task: "DeMorgan's", f: deMorgans},
		       {task: "eliminate double negation", f: eliminateDoubleNegation},
		       {task: "distribute or over and", f: distribOr},
		       {task: "complementation", f: doComplementation},
		       {task: "identity", f: doIdentity}
		      ];


	var toR = [{label: "inital expression", tree: tree}];
	actions.forEach(function (a) {
		while (true) {

			var newTree = a.f(toR.peek().tree);
			if (util.treeToExpr(newTree) == util.treeToExpr(toR.peek().tree))
				break;


			toR.push({label: a.task, tree: newTree});

			
		}
	});



	return toR;
		
}

module.exports.isCNF = isCNF;
function isCNF(tree) {
	var conjChild = function (tree) {
		var lc;
		if (tree.args[0].action == "conjunction") {
			lc = conjChild(tree.args[0]);
		} else {
			lc = otherChild(tree.args[0]);
		}


		if (tree.args[1].action == "conjunction") {
			return conjChild(tree.args[1]) && lc;
		} else {
			return otherChild(tree.args[1]) && lc;
		}


	};

	var otherChild = function (tree) {
		if (!tree)
			return false;
		if (tree.action == "substitution" || tree.action == "literal")
			return true;

		if (tree.action == "conjunction")
			return false;

		if (tree.action == "negation")
				return otherChild(tree.args[0]);

		if (tree.action == "disjunction")
				return otherChild(tree.args[0] && tree.args[1]);


		return false;
	};

	if (tree.action == "substitution" || (tree.action == "negation" && tree.args[0].action == "substitution"))
		return true;

	return conjChild(tree);
}

module.exports.splitClauses = splitClauses;
function splitClauses(tree) {
	var clauses = [];
	var findTopLevelDisjunctions = function (tree) {
		if (tree.action == "conjunction") {
			findTopLevelDisjunctions(tree.args[0]);
			findTopLevelDisjunctions(tree.args[1]);
			return;
		}

		clauses.push(tree);
	};

	findTopLevelDisjunctions(tree);
	return clauses;
	
}

},{"./util.js":4}],2:[function(require,module,exports){
/*
This file is part of llang.

llang is MIT licensed. Feel free to use it, contribute or spread the word. Created with love by Petr Nevyhoštěný (Twitter).
*/

module.exports.lex = lex;

function lex(input) {
    var pointer = 0;
    var tokens = [];
    var c;
    var operator = '';

    while (next()) {
        if (isSpecial(c)) {
            operator += c;
            if (operatorExists(operator)) {
                push('operator', operator);
                operator = '';
            }
        }

        else {
            if (operator.length) unrecognizedToken(operator, pointer - operator.length - 1);

            if (isWhiteSpace(c)) continue;
            else if (isVariable(c)) push('variable', c.toUpperCase());
            else if (isExpressionBoundary(c)) push('boundary', c);
            else unrecognizedToken(c, pointer - 2);
        }
    }

    return tokens;

    function next() {
        return (c = input[pointer++]);
    }

    function push(type, value) {
        tokens.push({
            type : type,
            value : value
        });
    }

    function isWhiteSpace(c) {
        return /\s/.test(c);
    }

    function isVariable(c) {
        return /[A-Za-z]/.test(c);
    }

    function isSpecial(c) {
        return /[<>\-|&!]/.test(c);
    }

    function isExpressionBoundary(c) {
        return /[\(\)]/.test(c);
    }

    function operatorExists(op) {
        return ['!', '|', '&', '->', '<->'].indexOf(op) !== -1;
    }

    function unrecognizedToken(token, position) {
        throw new Error('Unrecognized token "' + token + '" on position ' + position + '!');
    }
}

},{}],3:[function(require,module,exports){
module.exports.parse = parse;


/*
This file is part of llang.

llang is MIT licensed. Feel free to use it, contribute or spread the word. Created with love by Petr Nevyhoštěný (Twitter).
*/



function parse(tokens) {
    var token;
    return process();

    function process(operation) {
        operation = operation || null;
        var args = [];

        while (next()) {
            if (token.type == 'boundary') {
                if (token.value == '(') args.push(process());
                else if (token.value == ')') return node(operation, args);
            }

            else if (token.type == 'variable') {
                args.push(node('substitution', [ token.value ]));
                if (isUnary(operation)) return node(operation, args);
            }

            else if (token.type == 'operator') {
                if (isUnary(token.value)) {
                    args.push(process(token.value));
                    continue;
                }

                if (operation) {
                    var tmp = args.slice(0);
                    args = [];
                    args.push(node(operation, tmp));
                }

                operation = token.value;
            }
        }

        return node(operation, args);
    }

    function next() {
        //TODO: use pointer instead of shifting
        //(parse would not need to clone tokens array)
        return (token = tokens.shift());
    }

    function node(action, args) {
        return {
            action: translate(action),
            args: args
        };
    }

    function translate(operator) {
        var map = {
            '!': 'negation',
            '|': 'disjunction',
            '&': 'conjunction',
            '->': 'implication',
            '<->': 'equivalence'
        };

        return map[operator] || operator;
    }

    function isUnary(op) {
        return op === '!';
    }

    function syntaxError() {
        throw new Error('Syntax error!');
    }
}

},{}],4:[function(require,module,exports){
// Copyright 2015 Ryan Marcus
// This file is part of vulcan.
// 
// vulcan is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// 
// vulcan is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
// 
// You should have received a copy of the GNU Affero General Public License
// along with vulcan.  If not, see <http://www.gnu.org/licenses/>.


var parser = require("./parse.js");
var lexer = require("./lex.js");


Array.prototype.peek = function () {
	return this[this.length - 1];
};

if (!Array.prototype.includes) {
  Array.prototype.includes = function(searchElement /*, fromIndex*/ ) {
    'use strict';
    var O = Object(this);
    var len = parseInt(O.length) || 0;
    if (len === 0) {
      return false;
    }
    var n = parseInt(arguments[1]) || 0;
    var k;
    if (n >= 0) {
      k = n;
    } else {
      k = len + n;
      if (k < 0) {k = 0;}
    }
    var currentElement;
    while (k < len) {
      currentElement = O[k];
      if (searchElement === currentElement ||
         (searchElement !== searchElement && currentElement !== currentElement)) {
        return true;
      }
      k++;
    }
    return false;
  };
}

if (!String.prototype.startsWith) {
  String.prototype.startsWith = function(searchString, position) {
    position = position || 0;
    return this.indexOf(searchString, position) === position;
  };
}


function hoistNullActions(tree) {
	if (!tree || tree.action == "substitution" || tree.action == "literal")
		return tree;

	if (tree.action == null)
		return hoistNullActions(tree.args[0]);

	return { action: tree.action,
		 args: tree.args.map(hoistNullActions) };
}


module.exports.negate = negate;
function negate(a) {
	return { action: "negation",
		 args: [a] };
}

module.exports.treeToExpr = treeToExpr;
function treeToExpr(tree) {

	if (tree.action == "substitution") {
		return tree.args[0];
	}

	if (tree.action == "literal") {
		return tree.args[0];
	}

	if (tree.action == "negation") {
		if (tree.args[0].action == "substitution") {
			return "!" + tree.args[0].args[0];
		}
		return "(!" + treeToExpr(tree.args[0]) + ")";
	}



	if (tree.action == "conjunction") {
		return "(" + treeToExpr(tree.args[0]) + " & " +  treeToExpr(tree.args[1]) + ")";
	}

	if (tree.action == "disjunction") {
		return "(" + treeToExpr(tree.args[0]) + " | " +  treeToExpr(tree.args[1]) + ")";
	}

	if (tree.action == "implication") {
		return "(" + treeToExpr(tree.args[0]) + " -> " + treeToExpr(tree.args[1]) + ")";
	}

	if (tree.action == "equivalence") {
		return "(" + treeToExpr(tree.args[0]) + " <-> " + treeToExpr(tree.args[1]) + ")";
	}

	return "";


}



module.exports.proofToString = proofToString;
function proofToString(proof) {
	proof = proof.map(function(i) {
		if (i.label == "sep")
			return "------------------------------\n";
		
		if (i.tree) {
			return i.idx + "\t" + i.tree + "\t" + i.label + "\n";
		}

		return i.label + "\n";
	});

	return proof.join("");
}

module.exports.buildTree = buildTree;
function buildTree(string) {
	return hoistNullActions(parser.parse(lexer.lex(string)));
}

},{"./lex.js":2,"./parse.js":3}],"vulcan":[function(require,module,exports){
// Copyright 2015 Ryan Marcus
// This file is part of vulcan.
// 
// vulcan is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// 
// vulcan is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
// 
// You should have received a copy of the GNU Affero General Public License
// along with vulcan.  If not, see <http://www.gnu.org/licenses/>.


var cnf = require("./cnf.js");
var util = require("./util.js");




function findLiterals(clause) {
	var literals = [];
	var f = function (c) {
		if (!c)
			return;

		if (c.action == "negation" && c.args[0].action == "substitution") {
			literals.push("!" + c.args[0].args[0]);
			return;
		}


		if (c.action == "substitution") {
			literals.push(c.args[0]);
			return;
		}

		f(c.args[0]);
		f(c.args[1]);
		
	};

	f(clause);
	return literals;
}

function resolve(clause1, clause2) {

	var clause1literals = findLiterals(clause1);
	var clause2literals = findLiterals(clause2);

	var findCompLiterals = function(c1l, c2l) {
		var toR = [];
		c1l.forEach(function (i) {
			var symbol = (i.startsWith("!") ? i.substring(1) : i);
			var inverse = (i.startsWith("!") ? i.substring(1) : "!" + i);
			if (c2l.includes(inverse))
				toR.push(symbol);
		});
		return toR;
	};

	var compLit = findCompLiterals(clause1literals, clause2literals);
	if (compLit.length > 1) {
		// it's a tautology
		return {action: "literal",
			args: [true] };
	}

	var newLiterals = clause1literals.concat(clause2literals);

	newLiterals.sort();
	newLiterals = newLiterals.filter(function (i) {
		var symbol = (i.startsWith("!") ? i.substring(1) : i);
		if (compLit.includes(symbol))
			return false;
		return true;
	}).reduce(function (accum, nxt) {
		if (accum.peek() == nxt)
			return accum;

		return accum.concat([nxt]);

	}, []);


	if (newLiterals.length == 0)
		return {action: "literal",
			args: [false]};

	return util.buildTree(newLiterals.join(" | "));
	
}

module.exports.prove = prove;
function prove(sentences, q) {
	var cnfProofs = [];
	var toR = [];
	
	var pc = 0;

	// convert each sentence to CNF
	sentences.forEach(function (i) {
		var toAdd = cnf.convertToCNF(util.buildTree(i)).map(function (i) {
			i.idx = pc++;
			return i;
		});;
		toR = toR.concat(toAdd);
		cnfProofs.push(toR);
	});

	var pcCutoff = pc;

	// next, build the knowledge base
	var kb = cnfProofs.map(function (i) {
		var t = i.peek();
		return t;
	}).map(function (i) {
		var t = cnf.splitClauses(i.tree).map(function (c) {
			c.idx = pc++;
			c.from = i.idx;
			return c;
		});
		return t;
	}).reduce(function (accum, nxt) {
		return accum.concat(nxt);
	}, []);

//	toR.push({label: "sep"});

	kb.forEach(function (i) {
		toR.push({label: "knowledge base clause from " + i.from,
			  tree: i,
			  idx: i.idx});
	});

	// now add the negation of our query to the KB
	var negCNF = cnf.convertToCNF(util.negate(util.buildTree(q)));
	var neg = negCNF.peek().tree;
	cnf.splitClauses(negCNF.peek().tree).forEach(function (i) {
		i.idx = pc++;
		kb.push(i);
		toR.push({label: "assume for a contradiction",
			  tree: kb.peek(),
			  idx: kb.peek().idx});
	});
/*	neg.idx = pc++;
	kb.push(neg);
	toR.push({label: "assume for a contradiction",
		  tree: kb.peek(),
		  idx: kb.peek().idx});*/

	var findRequiredSteps = function(idx) {
		var requiredSteps = [idx];
		
		var step = toR.filter(function (i) {
			return i.idx == idx;
		})[0];


		if (!step.req)
			return requiredSteps;

		step.req.forEach(function (i) {
			requiredSteps = requiredSteps.concat(findRequiredSteps(i));
		});

		return requiredSteps;
	};

	while (true) {
		var newClauses = [];
		for (var i = 0; i < kb.length; i++) {
			for (var j = 1; j < kb.length; j++) {
				var resolvent = resolve(kb[i], kb[j]);
				//console.log(util.treeToExpr(kb[i]) + " // " + util.treeToExpr(kb[j]) + " -> " + util.treeToExpr(resolvent));
				if (newClauses.map(util.treeToExpr).includes(util.treeToExpr(resolvent)))
					continue;
				resolvent.idx = pc++;

				toR.push({label: "resolve of " + kb[i].idx + " and " + kb[j].idx,
					  tree: resolvent,
					  idx: resolvent.idx,
					  req: [kb[i].idx, kb[j].idx]});


				if (resolvent.action == "literal" && resolvent.args[0] == false) {
					// we found a contradiction!
					var req = findRequiredSteps(resolvent.idx);
					return toR.filter(function (i) {
						return req.includes(i.idx) || i.idx <= pcCutoff || i.label == "sep";
					}).map(function (i) {
						if (i.tree)
							i.tree = util.treeToExpr(i.tree);
						return i;
					});
					

				} 

				if (resolvent.action == "literal" && resolvent.args[0] == true) {
					// we found a tautology. not useful.
					continue;
				}
				newClauses.push(resolvent);
			}
		}
		

		var kbS = kb.map(util.treeToExpr);
		var haveAll = (newClauses.map(util.treeToExpr).every(function (i) {
			return kbS.includes(i);
		}));

		if (haveAll) {
			toR.push({label: "model exhausted, proof could not be reached"});
			return toR.map(function (i) {
				if (i.tree)
					i.tree = util.treeToExpr(i.tree);
				return i;
			});
				  
		}
		    

		kb = kb.concat(newClauses);
	}
}


module.exports.addParens = addParens;
function addParens(str) {
	return util.treeToExpr(util.buildTree(str));
}

module.exports.isProofComplete = isProofComplete;
function isProofComplete(proof) {
	return proof.peek().label != "model exhausted, proof could not be reached";
}

//console.log(proofToString(convertToCNF(buildTree("A -> B"))));
//console.log(cnf.splitClauses(buildTree("(A | B) & (C | D) & (!C | L)")).map(util.treeToExpr));
//console.log(resolve(buildTree("A"), buildTree("A")));

//console.log(util.proofToString(prove(["A <-> B", "!B"], "!A")));

},{"./cnf.js":1,"./util.js":4}]},{},[]);
