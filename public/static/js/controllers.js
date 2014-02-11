/* Controllers File */

function MainCntl($scope, HTTPService) {
	$scope.domain = window.location.origin;

	console.log('domain', $scope.domain)

	$scope.gridID;

	$scope.createCustomWidgetCode = function() {
		HTTPService.httpGET('/new-grid-id').then(function(data) {
			console.log('data', data)
			$scope.gridID = data;
		},
		function(err) {
			console.log('ERR:', err);
		});
	}

}