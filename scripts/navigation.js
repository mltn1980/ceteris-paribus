// ============================================
// NAVIGATION.JS - Navegación sticky y protección
// ============================================

// Protección contra copia
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('copy', e => e.preventDefault());
document.addEventListener('cut', e => e.preventDefault());
document.addEventListener('selectstart', e => e.preventDefault());

document.onkeydown = function(e) {
    // Bloquear Ctrl+C, Ctrl+X, Ctrl+A, Ctrl+U, F12, Ctrl+Shift+I
    if(e.ctrlKey && (e.key === 'c' || e.key === 'x' || e.key === 'a' || e.key === 'u' || e.key === 's')) {
        e.preventDefault();
        return false;
    }
    if(e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C'))) {
        e.preventDefault();
        return false;
    }
};

// Esperar a que el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Navegación activa en scroll
    const sections = document.querySelectorAll("main .section-label");
    const navLinks = document.querySelectorAll("nav a");
    let clickedId = null;
    let clickTimer = null;

    // Al hacer click en navegación, expandir sección si está colapsada
    navLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault(); // Prevenir scroll por defecto
            
            const targetId = link.getAttribute("href").replace("#","");
            clickedId = targetId;
            
            // Activar el link en la navegación
            navLinks.forEach(a => a.classList.remove("active"));
            link.classList.add("active");
            
            // Buscar la sección target
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                // Si la sección está colapsada, expandirla
                if (targetSection.classList.contains('collapsed')) {
                    targetSection.classList.remove('collapsed');
                    const toggleText = targetSection.querySelector('.toggle-text');
                    if (toggleText) toggleText.textContent = '▲ Ocultar';
                    
                    // También expandir el contenido
                    const nextContent = targetSection.nextElementSibling;
                    if (nextContent && nextContent.classList.contains('collapsible-content')) {
                        nextContent.classList.remove('collapsed');
                    }
                }
                
                // Scroll suave a la sección
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            
            clearTimeout(clickTimer);
            clickTimer = setTimeout(() => { clickedId = null; }, 1500);
        });
    });

    window.addEventListener("scroll", () => {
        if (clickedId) return;

        let current = "";
        const atBottom = (window.innerHeight + window.scrollY) >= (document.body.offsetHeight - 50);

        if (atBottom) {
            // Al fondo: buscar la sección cuyo título esté más cerca del centro de pantalla
            let bestDist = Infinity;
            const viewCenter = window.scrollY + window.innerHeight / 2;
            sections.forEach(section => {
                const id = section.getAttribute("id");
                const hasLink = document.querySelector('nav a[href="#'+id+'"]');
                if (!hasLink) return;
                const dist = Math.abs(section.offsetTop - viewCenter);
                if (dist < bestDist) {
                    bestDist = dist;
                    current = id;
                }
            });
        } else {
            sections.forEach(section => {
                const sectionTop = section.offsetTop - 120;
                if (scrollY >= sectionTop) {
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
    });
});
