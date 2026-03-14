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
