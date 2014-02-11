/* Controllers File */

function MainCntl($scope, HTTPService) {
	$scope.domain = window.location.origin;
	$scope.gridID;

	$scope.getGridId = function() {
		HTTPService.httpGET('/new-grid-id').then(function(data) {
			$scope.gridID = data;
		},
		function(err) {
			console.log('ERR:', err);
		});
	}

}