/*
 * Tiny function using pure JS to check for a class on an element
 */
function hasClass(s,a){return(" "+s.className+" ").indexOf(" "+a+" ")>-1};

const coverElement = document.querySelector('div.album_wrap');

coverElement.addEventListener('click', function() {
	if (coverElement.classList.contains('day')) {
		coverElement.classList.replace('day', 'night');
	} else if (coverElement.classList.contains('night')) {
		coverElement.classList.replace('night', 'day');
	}
});

inlineSVG.init({
	svgSelector: 'img.svg',
	initClass: 'inlinesvg',
}, function () {

});
