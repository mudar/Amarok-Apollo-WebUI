/*! Amarok WebUI scripts
*/

togglePlayPauseIcon = function(button, data) {
	if ( typeof data == 'undefined' ) return;
	
	if ( data['status'] == 'OK' ) {
		newIcon = 'amarok-pause';
		oldIcon = 'amarok-play';
		if ( data['engineState'] == 1 ) {
			newIcon = 'amarok-play';
			oldIcon = 'amarok-pause';
		}
		button.attr('data-icon', newIcon).find('.ui-icon').addClass('ui-icon-' + newIcon).removeClass('ui-icon-' + oldIcon);
	}
}

setEmptyPlaylist = function(data) {
	if ( typeof data == 'undefined' ) return;
	
	if ( data['status'] == 'OK') {
		$('#playlist ul').html('<li>Playlist is empty&hellip;</li>').listview('refresh');
		$('#clear-playlist').toggleClass('ui-disabled' , true);
	}
}

toggleCurrentTrack = function(button, data) {
	if ( typeof data == 'undefined' ) return;
	
	if ( data['status'] == 'OK') {
		$('#playlist li.ui-btn-active').removeClass('ui-btn-active');
		button.addClass('ui-btn-active');
	}
}

var AmarokFooterEvents = (function () {
	$('#control-buttons a').click(function() {
		var button = $(this);
		$.mobile.showPageLoadingMsg();
		button.toggleClass('ui-btn-active', true);
		$.getJSON( '/api/cmd/'+ button.attr('data-amarok-cmd') , function(data) {
			if ( button.attr('id') == 'btn-play-pause' ) {
				togglePlayPauseIcon(button, data);
			}

			var page = window.location.pathname;
			if ( page == '/current-track' ) 
			{
				if ( button.attr( 'data-amarok-cmd' ) == 'prev' || button.attr( 'data-amarok-cmd' ) == 'next' ) {
					setTimeout(function() { 
						$.mobile.changePage('/current-track',{reloadPage:true});
						$.mobile.hidePageLoadingMsg();
					},500);
				}
				else {
					$.mobile.hidePageLoadingMsg();
				}
			}
			else {
				if ( page == '/playlist' ) {
					var selected = null;
					if ( button.attr( 'data-amarok-cmd' ) == 'prev' ) {
						selected = $('#playlist .ui-btn-active').prev();
					}
					else if ( button.attr( 'data-amarok-cmd' ) == 'next' ) {
						selected = $('#playlist .ui-btn-active').next();
						if ( selected.length == 0 ) {
							selected = $('#playlist li:first-child');
						}
					}
					if ( selected.length != 0 ) {
						$('#playlist .ui-btn-active').removeClass('ui-btn-active');
						selected.addClass('ui-btn-active');
					}
				}
				$.mobile.hidePageLoadingMsg();
			}
			button.toggleClass('ui-btn-active', false).blur();
		});
	});
});
