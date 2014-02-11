/* Controllers File */

function MainCntl($scope, HTTPService) {
	$scope.domain = window.location.origin;

	console.log('domain', $scope.domain)

	$scope.gridID;

	$scope.createCustomWidgetCode = function() {
		$scope.gridID = '2';
	}

}