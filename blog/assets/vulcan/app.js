



var vulcanApp = angular.module('vulcanApp', [
	'vulcanServices',
	'vulcanControllers'
]);

var vulcanServices = angular.module('vulcanServices', []);

vulcanServices.factory("vulcan", [function () {
	var service = {};
	var vulcan = require("vulcan");
	service.prove = function (kb, q) {
		return vulcan.prove(kb, q);
	};

	service.clean = function(str) {
		return vulcan.addParens(str);
	};

	service.isProofComplete = function(proof) {
		return vulcan.isProofComplete(proof);
	};

	return service;

}]);


var vulcanControllers = angular.module('vulcanControllers', []);

vulcanControllers
	.controller('vulcanDemoCtrl',
		    ['$scope', 'vulcan',
		     function($scope, vulcan) {
			     $scope.rules = ["A -> B", "A"];
			     $scope.query = "B";
			     $scope.proof = "";
			     $scope.proofValid = false;
			     $scope.qedNumber = -1;

			     $scope.addRule = function() {
				     $scope.rules.push(vulcan.clean($scope.ruleInput));
				     $scope.ruleInput = "";
				     $scope.proof = "";
			     };

			     $scope.removeRule = function(idx) {
				     $scope.rules.splice(idx, 1);
				     $scope.proof = "";
			     };

			     $scope.prove = function() {
				     $scope.proof = vulcan.prove($scope.rules, $scope.query);
				     $scope.proofValid = vulcan.isProofComplete($scope.proof);
				     $scope.qedNumber = $scope.proof.peek().idx + 1;
			     };

			     $scope.prove();
			     
		     }]);
						


