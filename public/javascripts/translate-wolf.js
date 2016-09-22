$('.already-here')
	.hover(
		function () {
			console.log('Hovering!');
			$(this).children('.added-later').css({
				'visibility': 'inherit',
				'z-index': 100
			});
		},
		function () {
			console.log('Stopped hovering!');
			$(this).children('.added-later').css({
				'visibility': 'hidden',
				'z-index': -100
			});
		}
);