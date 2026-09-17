// Collapsible card pills

(function () {

    const COLLAPSED = 'tag-collapsed';
    const REVEALED = 'tag-revealed';

    const ROW_TOLERANCE = 4;

    function sameLine(offsetTop, lineTop) {
        return offsetTop <= lineTop + ROW_TOLERANCE;
    }

    function buildToggle() {
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'tag-toggle';
        toggle.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Show more');
        toggle.innerHTML =
            '<i class="fas fa-chevron-down"></i>' +
            '<span class="tag-toggle-label">Show More</span>';
        return toggle;
    }

    // Hide every pill that doesn't fit on the first line alongside the toggle
    function collapse(tags) {
        const toggle = tags.querySelector('.tag-toggle');
        const pills = Array.from(tags.querySelectorAll('.tag'));

        if (!toggle || !pills.length) return;

        pills.forEach(pill => pill.classList.remove(COLLAPSED, REVEALED));
        toggle.hidden = true;

        const firstLineTop = pills[0].offsetTop;
        let overflowing = false;

        pills.forEach(pill => {
            if (!sameLine(pill.offsetTop, firstLineTop)) {
                pill.classList.add(COLLAPSED);
                overflowing = true;
            }
        });

        if (!overflowing) return;

        toggle.hidden = false;

        const visible = pills.filter(pill => !pill.classList.contains(COLLAPSED));
        while (visible.length > 1 && !sameLine(toggle.offsetTop, firstLineTop)) {
            visible.pop().classList.add(COLLAPSED);
        }

        pills.forEach(pill => {
            if (!pill.classList.contains(COLLAPSED)) return;

            pill.classList.remove(COLLAPSED);
            if (!sameLine(pill.offsetTop, firstLineTop) || !sameLine(toggle.offsetTop, firstLineTop)) {
                pill.classList.add(COLLAPSED);
            }
        });
    }

    function expand(tags) {
        const toggle = tags.querySelector('.tag-toggle');

        tags.querySelectorAll('.' + COLLAPSED).forEach(pill => {
            pill.classList.remove(COLLAPSED);
            pill.classList.add(REVEALED);
        });

        toggle.setAttribute('aria-expanded', 'true');
        toggle.setAttribute('aria-label', 'Show less');
        toggle.querySelector('.tag-toggle-label').textContent = 'Show Less';
    }

    function reset(tags) {
        const toggle = tags.querySelector('.tag-toggle');

        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Show more');
        toggle.querySelector('.tag-toggle-label').textContent = 'Show More';
        collapse(tags);
    }

    function setup(tags) {
        // Skip containers that have no pills to manage
        if (!tags.querySelector('.tag')) return;

        let toggle = tags.querySelector('.tag-toggle');

        if (!toggle) {
            toggle = buildToggle();
            tags.appendChild(toggle);

            toggle.addEventListener('click', function () {
                if (tags.dataset.expanded === 'true') {
                    tags.dataset.expanded = 'false';
                    reset(tags);
                } else {
                    tags.dataset.expanded = 'true';
                    expand(tags);
                }
            });
        }

        // The toggle must stay last so it flows after the pills
        if (tags.lastElementChild !== toggle) {
            tags.appendChild(toggle);
        }

        tags.dataset.expanded = 'false';
        reset(tags);
    }

    function initCardTags(root) {
        const scope = root || document;
        scope.querySelectorAll('.card-content .tags').forEach(setup);
    }

    // Re-measure collapsed cards when the grid reflows to a different column count
    let resizeTimeout;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function () {
            document.querySelectorAll('.card-content .tags').forEach(tags => {
                if (tags.dataset.expanded !== 'true') {
                    collapse(tags);
                }
            });
        }, 150);
    });

    document.addEventListener('DOMContentLoaded', function () {
        initCardTags();

        // Pill widths change once Montserrat swaps in so measure again
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(function () {
                document.querySelectorAll('.card-content .tags').forEach(tags => {
                    if (tags.dataset.expanded !== 'true') {
                        collapse(tags);
                    }
                });
            });
        }
    });

    // Exposed so dynamically rebuilt cards can be re-measured
    window.initCardTags = initCardTags;
})();
