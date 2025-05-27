document.addEventListener('DOMContentLoaded', () => {
    // Seleção de cores
    const colorOptions = document.querySelectorAll('.color-option');
    
    // Função para manipular seleção de cores
    const handleColorSelection = (selectedOption) => {
        // Remove seleção anterior
        colorOptions.forEach(option => {
            option.classList.remove(
                'border-[#1d4ed8]',
                'border-2',
                'hover:border-[#1d4ed8]'
            );
            option.classList.add('border-transparent');
        });

        // Adiciona nova seleção
        selectedOption.classList.add('border-2', 'border-[#1d4ed8]');
        selectedOption.classList.remove('border-transparent');
    };

    // Event listeners para cores
    colorOptions.forEach(option => {
        option.addEventListener('click', () => handleColorSelection(option));
        option.addEventListener('mouseover', () => {
            if (!option.classList.contains('border-[#1d4ed8]')) {
                option.classList.add('hover:border-[#1d4ed8]');
            }
        });
        option.addEventListener('mouseout', () => {
            if (!option.classList.contains('border-[#1d4ed8]')) {
                option.classList.remove('hover:border-[#1d4ed8]');
            }
        });
    });

    // Validação do formulário
    const form = document.querySelector('form');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Validação básica
        const projectName = document.querySelector('input[type="text"]');
        if (projectName.value.trim() === '') {
            alert('Por favor, insira um nome para o projeto!');
            projectName.focus();
            return;
        }
        
        // Lógica de envio do formulário
        console.log('Projeto criado com sucesso!');
        form.reset();
    });
});