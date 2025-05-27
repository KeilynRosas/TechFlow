document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('taskForm');
    const cancelButton = form.querySelector('button[type="button"]');

    // Validação do Formulário
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const title = form.querySelector('input[type="text"]');
        const dueDate = form.querySelector('input[type="date"]');

        if (title.value.trim() === '') {
            alert('O título da tarefa é obrigatório!');
            title.focus();
            return;
        }

        if (!dueDate.value) {
            alert('A data de vencimento é obrigatória!');
            dueDate.focus();
            return;
        }

        // Simular envio
        console.log('Tarefa salva:', {
            title: title.value,
            description: form.querySelector('textarea').value,
            dueDate: dueDate.value,
            priority: form.querySelector('select').value,
            project: form.querySelectorAll('select')[1].value,
            status: form.querySelector('#status').checked
        });

        form.reset();
    });

    // Resetar Formulário
    cancelButton.addEventListener('click', () => {
        form.reset();
    });
});