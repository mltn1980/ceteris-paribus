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

// ============================================
// COLAPSAR/EXPANDIR - Función global
// ============================================
window.toggleAllSections = function () {
    const collapsibleSections = document.querySelectorAll('.section-label.collapsible');
    const collapsibleContents = document.querySelectorAll('.collapsible-content');
    const toggleText = document.getElementById('toggleText');

    const anyExpanded = Array.from(collapsibleSections).some(s => !s.classList.contains('collapsed'));

    collapsibleSections.forEach(section => {
        const toggleTextEl = section.querySelector('.toggle-text');
        if (anyExpanded) {
            section.classList.add('collapsed');
            if (toggleTextEl) toggleTextEl.textContent = '▼ Mostrar';
        } else {
            section.classList.remove('collapsed');
            if (toggleTextEl) toggleTextEl.textContent = '▲ Ocultar';
        }
    });

    collapsibleContents.forEach(content => {
        content.classList.toggle('collapsed', anyExpanded);
    });

    if (toggleText) toggleText.textContent = anyExpanded ? 'Expandir todo' : 'Colapsar todo';
};
