// Tab switching functionality
document.addEventListener('DOMContentLoaded', () => {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');

            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            document.getElementById(tabName).classList.add('active');

            // Save preference to localStorage
            localStorage.setItem('activeTab', tabName);
        });
    });

    // Restore last active tab
    const savedTab = localStorage.getItem('activeTab');
    if (savedTab) {
        const savedButton = document.querySelector(`[data-tab="${savedTab}"]`);
        if (savedButton) {
            savedButton.click();
        }
    }

    // Save checklist state to localStorage
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach((checkbox, index) => {
        // Restore saved state
        const savedState = localStorage.getItem(`checkbox-${index}`);
        if (savedState === 'true') {
            checkbox.checked = true;
        }

        // Save state on change
        checkbox.addEventListener('change', () => {
            localStorage.setItem(`checkbox-${index}`, checkbox.checked);
        });
    });

    // Reset button (optional)
    const resetButtonContainer = document.querySelector('.container');
    const resetButton = document.createElement('button');
    resetButton.textContent = 'Reset All';
    resetButton.className = 'reset-button';
    resetButton.style.cssText = `
        display: block;
        margin: 20px auto;
        padding: 10px 20px;
        background: #f0f0f0;
        border: 1px solid #ddd;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.9em;
        color: #666;
        transition: all 0.3s ease;
    `;

    resetButton.addEventListener('mouseover', () => {
        resetButton.style.background = '#e0e0e0';
    });

    resetButton.addEventListener('mouseout', () => {
        resetButton.style.background = '#f0f0f0';
    });

    resetButton.addEventListener('click', () => {
        if (confirm('Reset all checkboxes? This cannot be undone.')) {
            checkboxes.forEach((checkbox, index) => {
                checkbox.checked = false;
                localStorage.removeItem(`checkbox-${index}`);
            });
        }
    });

    // Add reset button at the end of the container
    resetButtonContainer.appendChild(resetButton);
});
