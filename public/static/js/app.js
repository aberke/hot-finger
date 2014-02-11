var HotFingerApp = angular.module('HotFingerApp', [])
	
	.config(function($provide) {
		
		/* register services */
		$provide.factory('HTTPService', HTTPService);

	});
