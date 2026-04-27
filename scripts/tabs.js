// ============================================
// TABS.JS - Sistemas de pestañas
// ============================================

function initTabSystem({ tabSelector, contentSelector, dataAttr, activeColor, extraSelector }) {
    const tabs = document.querySelectorAll(tabSelector);
    if (!tabs.length) return;

    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            const value = this.getAttribute(dataAttr);

            tabs.forEach(t => {
                t.classList.remove('active');
                t.style.borderBottomColor = 'transparent';
                t.style.color = 'var(--text2)';
                t.style.background = 'transparent';
            });
            this.classList.add('active');
            this.style.borderBottomColor = activeColor;
            this.style.color = 'var(--text)';
            this.style.background = 'var(--surface)';

            document.querySelectorAll(contentSelector).forEach(c => {
                c.style.display = 'none';
                c.classList.remove('active');
            });

            if (extraSelector) {
                document.querySelectorAll(extraSelector).forEach(b => b.style.display = 'none');
            }

            const target = document.querySelector(`${contentSelector}[${dataAttr}="${value}"]`);
            if (target) {
                target.style.display = 'block';
                target.classList.add('active');
            }

            if (extraSelector) {
                const extraTarget = document.querySelector(`${extraSelector}[${dataAttr}="${value}"]`);
                if (extraTarget) extraTarget.style.display = 'block';
            }

            // Deslizar el tab activo al borde izquierdo del contenedor
            const container = this.parentElement;
            const tabLeft = this.getBoundingClientRect().left - container.getBoundingClientRect().left + container.scrollLeft;
            container.scrollTo({ left: tabLeft, behavior: 'smooth' });
        });
    });

    // Aplicar estilos al tab activo inicial
    const activeTab = document.querySelector(`${tabSelector}.active`);
    if (activeTab) {
        activeTab.style.borderBottomColor = activeColor;
        activeTab.style.color = 'var(--text)';
        activeTab.style.background = 'var(--surface)';
    }
}

initTabSystem({
    tabSelector: '.ganaderia-tab',
    contentSelector: '.ganaderia-content',
    dataAttr: 'data-ganaderia',
    activeColor: 'var(--red)'
});

initTabSystem({
    tabSelector: '.grain-tab',
    contentSelector: '.grain-content',
    dataAttr: 'data-grain',
    activeColor: 'var(--amber)',
    extraSelector: '.grain-button'
});

initTabSystem({
    tabSelector: '.lacteos-tab',
    contentSelector: '.lacteos-content',
    dataAttr: 'data-lacteos',
    activeColor: '#4a90e2'
});

initTabSystem({
    tabSelector: '.uruguay-tab',
    contentSelector: '.uruguay-content',
    dataAttr: 'data-uruguay',
    activeColor: 'var(--green)'
});

initTabSystem({
    tabSelector: '.deuda-tab',
    contentSelector: '.deuda-content',
    dataAttr: 'data-deuda',
    activeColor: 'var(--green)'
});

initTabSystem({
    tabSelector: '.pbi-tab',
    contentSelector: '.pbi-content',
    dataAttr: 'data-pbi',
    activeColor: 'var(--blue)'
});

initTabSystem({
    tabSelector: '.fin-tab',
    contentSelector: '.fin-content',
    dataAttr: 'data-fin',
    activeColor: '#0f5c6b'
});

// ============================================
// COLAPSAR/EXPANDIR - Animación JS con height real
// Reemplaza el approach max-height (frágil con canvas y scroll containers)
// por una animación de height medida que garantiza collapse completo.
// ============================================
function toggleCollapsible(header) {
    const content = header.nextElementSibling;
    const toggleText = header.querySelector('.toggle-text');
    if (!content) return;

    const isCollapsed = content.classList.contains('collapsed');

    if (isCollapsed) {
        // EXPANDIR
        content.style.display = '';
        content.style.overflow = 'hidden';
        content.style.height = '0px';
        content.style.opacity = '0';
        content.getBoundingClientRect(); // force reflow
        const target = content.scrollHeight;
        content.style.transition = 'height 0.35s ease, opacity 0.3s ease';
        content.style.height = target + 'px';
        content.style.opacity = '1';
        content.classList.remove('collapsed');
        header.classList.remove('collapsed');
        if (toggleText) toggleText.textContent = '▲ Ocultar';
        content.addEventListener('transitionend', function done(e) {
            if (e.propertyName !== 'height') return;
            content.style.height = '';
            content.style.overflow = '';
            content.style.transition = '';
            content.removeEventListener('transitionend', done);
        });
    } else {
        // COLAPSAR
        content.style.overflow = 'hidden';
        content.style.height = content.scrollHeight + 'px';
        content.style.transition = 'height 0.35s ease, opacity 0.3s ease';
        content.getBoundingClientRect(); // force reflow
        content.style.height = '0px';
        content.style.opacity = '0';
        content.classList.add('collapsed');
        header.classList.add('collapsed');
        if (toggleText) toggleText.textContent = '▼ Mostrar';
        content.addEventListener('transitionend', function done(e) {
            if (e.propertyName !== 'height') return;
            content.style.display = 'none';
            content.style.height = '';
            content.style.opacity = '';
            content.style.overflow = '';
            content.style.transition = '';
            content.removeEventListener('transitionend', done);
        });
    }
}

// Reemplaza los onclick inline de cada sección colapsable
document.querySelectorAll('.section-label.collapsible').forEach(function (header) {
    header.onclick = function () { toggleCollapsible(header); };
});

// ============================================
// COLAPSAR/EXPANDIR - Función global
// ============================================
window.toggleAllSections = function () {
    const collapsibleSections = document.querySelectorAll('.section-label.collapsible');
    const toggleText = document.getElementById('toggleText');
    const anyExpanded = Array.from(collapsibleSections).some(s => !s.classList.contains('collapsed'));

    collapsibleSections.forEach(function (header) {
        const isCollapsed = header.classList.contains('collapsed');
        if (anyExpanded && !isCollapsed) toggleCollapsible(header);
        if (!anyExpanded && isCollapsed) toggleCollapsible(header);
    });

    if (toggleText) toggleText.textContent = anyExpanded ? 'Expandir todo' : 'Colapsar todo';
};
