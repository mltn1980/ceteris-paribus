// ============================================
// NAVIGATION.JS - Navegación sticky
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const sections = document.querySelectorAll("main .section-label");
    const navLinks = document.querySelectorAll("nav a");
    let clickedId = null;
    let clickTimer = null;
    let scrollTimeout = null;

    navLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();

            const targetId = link.getAttribute("href").replace("#", "");
            clickedId = targetId;

            navLinks.forEach(a => a.classList.remove("active"));
            link.classList.add("active");

            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                if (targetSection.classList.contains('collapsed')) {
                    targetSection.classList.remove('collapsed');
                    const toggleText = targetSection.querySelector('.toggle-text');
                    if (toggleText) toggleText.textContent = '▲ Ocultar';

                    const nextContent = targetSection.nextElementSibling;
                    if (nextContent && nextContent.classList.contains('collapsible-content')) {
                        nextContent.classList.remove('collapsed');
                    }
                }

                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }

            clearTimeout(clickTimer);
            clickTimer = setTimeout(() => { clickedId = null; }, 1500);
        });
    });

    window.addEventListener("scroll", () => {
        if (clickedId) return;

        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            let current = "";
            const atBottom = (window.innerHeight + window.scrollY) >= (document.body.offsetHeight - 50);

            if (atBottom) {
                let bestDist = Infinity;
                const viewCenter = window.scrollY + window.innerHeight / 2;
                sections.forEach(section => {
                    const id = section.getAttribute("id");
                    if (!document.querySelector('nav a[href="#' + id + '"]')) return;
                    const dist = Math.abs(section.offsetTop - viewCenter);
                    if (dist < bestDist) {
                        bestDist = dist;
                        current = id;
                    }
                });
            } else {
                sections.forEach(section => {
                    if (scrollY >= section.offsetTop - 120) {
                        current = section.getAttribute("id");
                    }
                });
            }

            navLinks.forEach(link => {
                link.classList.remove("active");
                if (link.getAttribute("href") === "#" + current) {
                    link.classList.add("active");
                }
            });
        }, 80);
    }, { passive: true });
});
