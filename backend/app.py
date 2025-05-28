# backend/app.py
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from flask_cors import CORS
import jwt
from datetime import datetime, timedelta
import re
import logging

# =============================================
# CONFIGURAÇÃO INICIAL
# =============================================
app = Flask(__name__)
CORS(app)  # Habilita CORS para desenvolvimento

# Configurações
app.config['SECRET_KEY'] = 'techflow-super-secret-key'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///techflow.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'techflow-jwt-secret-key'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)

# Inicialização do banco de dados
db = SQLAlchemy(app)

# Configuração de logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# =============================================
# MODELO DE DADOS
# =============================================
class Usuario(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    senha = db.Column(db.String(200), nullable=False)

    def __repr__(self):
        return f'<Usuario {self.email}>'

# Cria tabelas (executar uma vez)
with app.app_context():
    db.create_all()

# =============================================
# FUNÇÕES AUXILIARES
# =============================================
def validar_email(email):
    try:
        return re.match(r'^[\w\.-]+@[\w\.-]+\.\w{2,}$', email)
    except Exception as e:
        logger.error(f"Erro na validação de email: {str(e)}")
        return False

# =============================================
# ROTAS DE AUTENTICAÇÃO
# =============================================
@app.route('/cadastro', methods=['POST'])
def cadastrar_usuario():
    try:
        dados = request.get_json()
        
        # Validação de campos obrigatórios
        campos_obrigatorios = ['nome', 'email', 'senha', 'confirmarSenha']
        for campo in campos_obrigatorios:
            if campo not in dados:
                return jsonify({'erro': f'Campo obrigatório faltando: {campo}'}), 400
        
        # Validações específicas
        if not validar_email(dados['email']):
            return jsonify({'erro': 'Formato de email inválido'}), 400
            
        if len(dados['senha']) < 8:
            return jsonify({'erro': 'Senha deve ter pelo menos 8 caracteres'}), 400
            
        if dados['senha'] != dados['confirmarSenha']:
            return jsonify({'erro': 'As senhas não coincidem'}), 400
            
        # Verifica email existente
        if Usuario.query.filter_by(email=dados['email'].lower()).first():
            return jsonify({'erro': 'Email já cadastrado'}), 409
            
        # Cria usuário
        novo_usuario = Usuario(
            nome=dados['nome'].strip(),
            email=dados['email'].lower().strip(),
            senha=generate_password_hash(dados['senha'], method='scrypt')
        )
        
        db.session.add(novo_usuario)
        db.session.commit()
        
        return jsonify({
            'mensagem': 'Cadastro realizado com sucesso!',
            'usuario': {
                'id': novo_usuario.id,
                'nome': novo_usuario.nome,
                'email': novo_usuario.email
            }
        }), 201
        
    except Exception as e:
        logger.error(f"Erro no cadastro: {str(e)}")
        db.session.rollback()
        return jsonify({'erro': 'Erro interno no servidor'}), 500

@app.route('/login', methods=['POST'])
def login_usuario():
    try:
        dados = request.get_json()
        
        # Validação básica
        if not dados or 'email' not in dados or 'senha' not in dados:
            return jsonify({"erro": "Email e senha são obrigatórios"}), 400
        
        # Busca usuário
        usuario = Usuario.query.filter_by(
            email=dados['email'].lower().strip()
        ).first()
        
        # Verifica credenciais
        if not usuario or not check_password_hash(usuario.senha, dados['senha']):
            return jsonify({"erro": "Credenciais inválidas"}), 401
        
        # Gera token JWT
        token = jwt.encode({
            'sub': usuario.id,
            'exp': datetime.utcnow() + app.config['JWT_ACCESS_TOKEN_EXPIRES'],
            'nome': usuario.nome
        }, app.config['JWT_SECRET_KEY'], algorithm='HS256')
        
        return jsonify({
            "mensagem": "Login realizado com sucesso!",
            "token": token,
            "usuario": {
                "id": usuario.id,
                "nome": usuario.nome,
                "email": usuario.email
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Erro no login: {str(e)}")
        return jsonify({"erro": "Erro interno no servidor"}), 500

# =============================================
# ROTA DE VERIFICAÇÃO
# =============================================
@app.route('/perfil', methods=['GET'])
def perfil_usuario():
    try:
        # Verifica token
        token = request.headers.get('Authorization').split()[1]
        payload = jwt.decode(
            token, 
            app.config['JWT_SECRET_KEY'],
            algorithms=['HS256']
        )
        
        usuario = Usuario.query.get(payload['sub'])
        
        return jsonify({
            "id": usuario.id,
            "nome": usuario.nome,
            "email": usuario.email
        }), 200
        
    except Exception as e:
        logger.error(f"Erro de autenticação: {str(e)}")
        return jsonify({"erro": "Acesso não autorizado"}), 401

# =============================================
# ROTA DE SAÚDE
# =============================================
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "online",
        "versao": "1.0.0",
        "hora_servidor": datetime.utcnow().isoformat()
    }), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)