/*! Amarok WebUI scripts
*/

AmarokI18N = function() {
	$('[data-amarok-lang]').each(function() {
		if ( $(this).hasClass('ui-btn') ) {
			lg = lang[$(this).attr('data-amarok-lang')];
			$(this).find('.ui-btn-text').html(lg);
			$(this).attr('title',lg);
		}
		else {
			$(this).html(lang[$(this).attr('data-amarok-lang')]);
		}
	});
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
					var selected = [];
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
	
	/**
	 * Handle Guest countdown
	 */
	if ( isGuest() ) {
		nextSubmitDate = getGuestNextSubmitDate();
		if ( nextSubmitDate == null ) {
			$(".playlist-countdown").html( lang['error_network'] );
		}
		else {
			if ( nextSubmitDate > new Date() ) {
				$('.track .track-add.ui-link-inherit').addClass('ui-disabled');
			}
			$(".playlist-countdown").countdown({until: nextSubmitDate,format:'MS',compact:true,onExpiry:hideGuestCountdown,alwaysExpire:true});
		}
	}
});

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
		$('#playlist ul').html('<li class="empty">'+lang['error_playlist_empty']+'</li>').listview('refresh');
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

toggleCollectionTabs = function(tabOn, tabOff) {
	tabOff.removeClass("ui-btn-active");
	tabOn.addClass("ui-btn-active");
	$( "." + tabOff.attr("data-tab-class") ).removeClass("ui-screen-visible").addClass("ui-screen-hidden");
	$( "." + tabOn.attr("data-tab-class") ).removeClass("ui-screen-hidden").addClass("ui-screen-visible");
}

changeCurrentTrack = function(cmd) {
	$.getJSON( '/api/cmd/'+ cmd , function(data) {
		setTimeout(function() { 
			$.mobile.changePage('/current-track',{reloadPage:true});
			$.mobile.hidePageLoadingMsg();
		},500);
	});
}

removePlaylistTrack = function(listitem, transition) {
	var index = listitem.find("a.ui-link-inherit").attr("data-amarok-track-id");

	// Highlight the list item that will be removed
	listitem.addClass( "ui-btn-down-d" );

	// Proceed to remove track
	$.mobile.showPageLoadingMsg();
	$.getJSON( '/api/cmd/removeByIndex/'+ index, function(data) {
		if ( data['status'] == 'OK' ) {
			// Update playlist index of following tracks
			$("#playlist .track a.ui-link-inherit").each(function(){
				currentIndex = parseInt($(this).attr("data-amarok-track-id"));
				if ( currentIndex > index ) {
					$(this).attr("data-amarok-track-id", currentIndex - 1);
				}
			});

			if ( transition ) {
				// Remove track with a transition
				listitem.addClass( transition )
					.on( "webkitTransitionEnd transitionend otransitionend", function() {
						listitem.remove();
						$( "#playlist ul" ).listview( "refresh" ).find( ".ui-li.border" ).removeClass( "border" );
					}).prev( "li.ui-li" ).addClass( "border" );
			}
			else {
				// If CSS transition isn't supported just remove track and refresh the list
				listitem.remove();
				$( "#playlist ul" ).listview( "refresh" );
			}

			if ( data['results']['totalTrackCount'] == 0 ) {
				// Playlist is now empty
				setEmptyPlaylist(data);
				$('#clear-playlist').toggleClass('ui-btn-active');
				$('#clear-playlist').blur();
			}
		}
		$.mobile.hidePageLoadingMsg();
	});
}

addPlaylistTrack = function(listitem) {
	$.mobile.showPageLoadingMsg();
	var parent = listitem.parent();
	parent.toggleClass('ui-btn-active');

	var apiUrl = '/api/cmd/addPlayMedia/';
	var btn = null;
	if ( listitem.hasClass('track-add') ) {
		apiUrl = '/api/cmd/addMedia/';
		btn = listitem;
	}

	$.getJSON( apiUrl + listitem.attr("data-amarok-track-id") , function(data) {
		if ( btn != null ) {
			btn.addClass('ui-disabled');
		}
		parent.toggleClass('ui-btn-active');
		$.mobile.hidePageLoadingMsg();

		if ( isGuest() ) {
			untilDate = getGuestNextSubmitDate();
			if ( untilDate >= new Date() ) {
				$('.track .track-add.ui-link-inherit').addClass('ui-disabled');
				$('footer').slideDown();
				$(".playlist-countdown").countdown({until: untilDate,format:'MS',compact:true,onExpiry:hideGuestCountdown,alwaysExpire:true});
			}
			if ( data['status'] == 'fail' ) {
				$( ".countdown-error" ).popup();
				$( ".countdown-error" ).popup( "open" );
			}
		}
	});
}

isGuest = function() {
	return $('body').hasClass('role_guest');
}

/**
 * Handle Guest countdown
 */
hideGuestCountdown = function() {
	if ( new Date() >= getGuestNextSubmitDate() ) {
		$('.track .track-add.ui-link-inherit').removeClass('ui-disabled');
		$(".playlist-countdown").countdown('destroy');
		$('footer').slideUp('fast');
	}
	else {
		$.mobile.changePage(window.location.href,{reloadPage: true});
	}
}

getGuestNextSubmitDate = function() { 
    var date = null; 
    $.ajax({url: '/api/getGuestCountdown', 
        async: false, dataType: 'json', 
        success: function(data) { 
			date = new Date(parseInt(data['results']['nextSubmitTime'])); 
        }}); 
    return date;
}
