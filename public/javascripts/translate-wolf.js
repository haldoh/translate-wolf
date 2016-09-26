// $('.already-here')
// 	.hover(
// 		function () {
// 			console.log('Hovering!');
// 			$(this).children('.added-later').css({
// 				'visibility': 'inherit',
// 				'z-index': 100
// 			});
// 		},
// 		function () {
// 			console.log('Stopped hovering!');
// 			$(this).children('.added-later').css({
// 				'visibility': 'hidden',
// 				'z-index': -100
// 			});
// 		}
// );

$('[data-tooltip!=""]').qtip({ // Grab all elements with a non-blank data-tooltip attr.
	content: {
		attr: 'data-tooltip' // Tell qTip2 to look inside this attr for its content
	},
	style: {
		classes: 'qtip-tipsy'
	}
});