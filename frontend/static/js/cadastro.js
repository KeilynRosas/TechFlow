// frontend/static/js/cadastro.js
document.getElementById('cadastroForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        nome: document.getElementById('nome').value.trim(),
        email: document.getElementById('email').value.trim().toLowerCase(),
        senha: document.getElementById('senha').value,
        confirmarSenha: document.getElementById('confirmarSenha').value
    };

    try {
        const response = await fetch('http://localhost:5000/cadastro', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.erro || 'Erro desconhecido');
        }

        // Redireciona se sucesso
        alert(data.mensagem);
        window.location.href = '/login.html'; 

    } catch (error) {
        // Exibe mensagem de erro detalhada
        alert(`Erro no cadastro: ${error.message}`);
    }
})