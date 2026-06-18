from flask import Flask, request, jsonify
import sqlite3
import os
import uuid
import random

app = Flask(__name__, static_folder='.', static_url_path='')
# SQLite database path configuration (dynamic for Render persistent disk or local development)
DATABASE = os.environ.get('DATABASE_PATH')
if not DATABASE:
    if os.path.exists('/var/data') or os.environ.get('RENDER') == 'true':
        try:
            os.makedirs('/var/data', exist_ok=True)
        except Exception:
            pass
        DATABASE = '/var/data/database.db'
    else:
        DATABASE = 'database.db'


def get_db_connection():
    conn = sqlite3.connect(DATABASE, timeout=20.0)
    conn.row_factory = sqlite3.Row
    # Enable foreign keys
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Profiles table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS profiles (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT UNIQUE NOT NULL,
            color TEXT NOT NULL,
            pin TEXT,
            security_question TEXT,
            security_answer TEXT
        )
    ''')
    
    # Alter profiles table to add columns if they don't exist in older databases
    try:
        cursor.execute("ALTER TABLE profiles ADD COLUMN security_question TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE profiles ADD COLUMN security_answer TEXT")
    except sqlite3.OperationalError:
        pass
    
    # Transactions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            profile_id TEXT NOT NULL,
            type TEXT NOT NULL,
            category TEXT NOT NULL,
            amount REAL NOT NULL,
            date TEXT NOT NULL,
            desc TEXT,
            FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE CASCADE
        )
    ''')
    
    # Budgets table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS budgets (
            profile_id TEXT NOT NULL,
            category TEXT NOT NULL,
            limit_amount REAL NOT NULL,
            PRIMARY KEY (profile_id, category),
            FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE CASCADE
        )
    ''')
    
    # Themes table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS themes (
            profile_id TEXT PRIMARY KEY,
            theme TEXT NOT NULL DEFAULT 'dark',
            color_theme TEXT NOT NULL DEFAULT 'midnight',
            FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE CASCADE
        )
    ''')
    
    # Seed default profile if empty
    cursor.execute("SELECT COUNT(*) FROM profiles")
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
            INSERT INTO profiles (id, name, email, phone, color, pin, security_question, security_answer)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, ('p-default', 'Veera M.', 'veera@example.com', '9876543210', '#6366f1', None, 'What was the name of your first pet?', 'doggy'))
        
        # Seed default themes
        cursor.execute("""
            INSERT INTO themes (profile_id, theme, color_theme)
            VALUES (?, ?, ?)
        """, ('p-default', 'dark', 'midnight'))
        
        # Seed default budgets
        default_budgets = {
            'Food': 400.0,
            'Shopping': 250.0,
            'Entertainment': 150.0,
            'Transport': 200.0,
            'Utilities': 150.0,
            'Other': 200.0
        }
        for cat, val in default_budgets.items():
            cursor.execute("""
                INSERT INTO budgets (profile_id, category, limit_amount)
                VALUES (?, ?, ?)
            """, ('p-default', cat, val))
            
    conn.commit()
    conn.close()

# Initialize Database on Startup
init_db()

@app.route('/')
def serve_index():
    return app.send_static_file('index.html')

# --- PROFILE REST ENDPOINTS ---

@app.route('/api/profiles', methods=['GET'])
def get_profiles():
    conn = get_db_connection()
    profiles = conn.execute('SELECT id, name, email, phone, color, (pin IS NOT NULL) as has_pin FROM profiles').fetchall()
    conn.close()
    return jsonify([dict(p) for p in profiles])

@app.route('/api/profiles/signup', methods=['POST'])
def signup_profile():
    data = request.json
    name = data.get('name')
    email = data.get('email', '').strip().lower()
    phone = data.get('phone', '').strip()
    security_question = data.get('security_question')
    security_answer = data.get('security_answer', '').strip()
    
    if not name or not email or not phone or not security_question or not security_answer:
        return jsonify({'error': 'Name, email, phone, security question and answer are required'}), 400
        
    conn = get_db_connection()
    
    # Check duplicate
    existing = conn.execute('SELECT * FROM profiles WHERE LOWER(email) = ? OR phone = ?', (email, phone)).fetchone()
    if existing:
        conn.close()
        return jsonify({'error': 'An account with this email or phone number already exists'}), 409
        
    profile_id = 'p-' + str(uuid.uuid4().hex[:12])
    colors = ['#6366f1', '#d946ef', '#10b981', '#f59e0b', '#0ea5e9', '#888888']
    color = random.choice(colors)
    
    try:
        conn.execute('INSERT INTO profiles (id, name, email, phone, color, pin, security_question, security_answer) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                     (profile_id, name, email, phone, color, None, security_question, security_answer.lower()))
        
        # Seed default themes
        conn.execute('INSERT INTO themes (profile_id, theme, color_theme) VALUES (?, ?, ?)',
                     (profile_id, 'dark', 'midnight'))
        
        # Seed default budgets
        default_budgets = {
            'Food': 400.0, 'Shopping': 250.0, 'Entertainment': 150.0,
            'Transport': 200.0, 'Utilities': 150.0, 'Other': 200.0
        }
        for cat, val in default_budgets.items():
            conn.execute('INSERT INTO budgets (profile_id, category, limit_amount) VALUES (?, ?, ?)',
                         (profile_id, cat, val))
                          
        conn.commit()
        conn.close()
        
        return jsonify({
            'id': profile_id,
            'name': name,
            'email': email,
            'phone': phone,
            'color': color,
            'has_pin': False
        }), 201
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/profiles/signin', methods=['POST'])
def signin_profile():
    data = request.json
    identifier = data.get('identifier', '').strip().lower()
    
    if not identifier:
        return jsonify({'error': 'Email or phone number is required'}), 400
        
    conn = get_db_connection()
    profile = conn.execute("""
        SELECT id, name, email, phone, color, (pin IS NOT NULL) as has_pin 
        FROM profiles 
        WHERE LOWER(email) = ? OR phone = ?
    """, (identifier, identifier)).fetchone()
    conn.close()
    
    if not profile:
        return jsonify({'error': 'No profile found with this email or mobile number'}), 404
        
    return jsonify(dict(profile))

@app.route('/api/profiles/verify-pin', methods=['POST'])
def verify_pin():
    data = request.json
    profile_id = data.get('profile_id')
    pin = data.get('pin')
    
    if not profile_id or not pin:
        return jsonify({'error': 'Profile ID and PIN are required'}), 400
        
    conn = get_db_connection()
    profile = conn.execute('SELECT pin FROM profiles WHERE id = ?', (profile_id,)).fetchone()
    conn.close()
    
    if not profile:
        return jsonify({'error': 'Profile not found'}), 404
        
    if profile['pin'] == pin:
        return jsonify({'success': True})
    else:
        return jsonify({'success': False, 'error': 'Incorrect PIN code'}), 401

@app.route('/api/profiles/setup-pin', methods=['POST'])
def setup_pin():
    data = request.json
    profile_id = data.get('profile_id')
    pin = data.get('pin')
    
    if not profile_id or not pin:
        return jsonify({'error': 'Profile ID and PIN are required'}), 400
        
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute('UPDATE profiles SET pin = ? WHERE id = ?', (pin, profile_id))
        if cursor.rowcount == 0:
            conn.close()
            return jsonify({'error': 'Profile not found'}), 404
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/profile/<profile_id>/security-question', methods=['GET'])
def get_security_question(profile_id):
    conn = get_db_connection()
    profile = conn.execute('SELECT security_question FROM profiles WHERE id = ?', (profile_id,)).fetchone()
    conn.close()
    
    if not profile:
        return jsonify({'error': 'Profile not found'}), 404
        
    return jsonify({
        'security_question': profile['security_question']
    })

@app.route('/api/profiles/verify-identity', methods=['POST'])
def verify_identity():
    data = request.json
    profile_id = data.get('profile_id')
    answer = data.get('answer', '').strip().lower()
    identifier = data.get('identifier', '').strip().lower()
    
    if not profile_id:
        return jsonify({'error': 'Profile ID is required'}), 400
        
    conn = get_db_connection()
    profile = conn.execute('SELECT email, phone, security_answer FROM profiles WHERE id = ?', (profile_id,)).fetchone()
    conn.close()
    
    if not profile:
        return jsonify({'error': 'Profile not found'}), 404
        
    # Check security answer first if configured
    if profile['security_answer']:
        if profile['security_answer'].lower() == answer:
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'error': 'Incorrect security answer'}), 401
            
    # Fallback to email/phone for older accounts that don't have security answer set
    if identifier and (profile['email'].lower() == identifier or profile['phone'] == identifier):
        return jsonify({'success': True})
        
    return jsonify({'success': False, 'error': 'Incorrect email, phone number, or security answer'}), 401

# --- PROFILE STATE & DATA ENDPOINTS ---

@app.route('/api/profile/<profile_id>/state', methods=['GET'])
def get_profile_state(profile_id):
    conn = get_db_connection()
    
    profile = conn.execute('SELECT id, name FROM profiles WHERE id = ?', (profile_id,)).fetchone()
    if not profile:
        conn.close()
        return jsonify({'error': 'Profile not found'}), 404
        
    # Get theme
    theme_row = conn.execute('SELECT theme, color_theme FROM themes WHERE profile_id = ?', (profile_id,)).fetchone()
    theme = theme_row['theme'] if theme_row else 'dark'
    color_theme = theme_row['color_theme'] if theme_row else 'midnight'
    
    # Get budgets
    budgets_rows = conn.execute('SELECT category, limit_amount FROM budgets WHERE profile_id = ?', (profile_id,)).fetchall()
    budgets = {b['category']: b['limit_amount'] for b in budgets_rows}
    
    # Get transactions
    tx_rows = conn.execute("""
        SELECT id, type, category, amount, date, desc 
        FROM transactions 
        WHERE profile_id = ?
        ORDER BY date DESC
    """, (profile_id,)).fetchall()
    
    transactions = [dict(t) for t in tx_rows]
    conn.close()
    
    return jsonify({
        'transactions': transactions,
        'budgets': budgets,
        'theme': theme,
        'colorTheme': color_theme
    })

@app.route('/api/profile/<profile_id>/transactions', methods=['POST'])
def add_transaction(profile_id):
    data = request.json
    tx_id = data.get('id')
    tx_type = data.get('type')
    category = data.get('category')
    amount = data.get('amount')
    date = data.get('date')
    desc = data.get('desc', '')
    
    if not tx_id or not tx_type or not category or amount is None or not date:
        return jsonify({'error': 'Invalid transaction data'}), 400
        
    conn = get_db_connection()
    try:
        conn.execute("""
            INSERT INTO transactions (id, profile_id, type, category, amount, date, desc)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (tx_id, profile_id, tx_type, category, float(amount), date, desc))
        conn.commit()
        conn.close()
        return jsonify({'success': True}), 201
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/profile/<profile_id>/transactions/<tx_id>', methods=['DELETE'])
def delete_transaction(profile_id, tx_id):
    conn = get_db_connection()
    try:
        conn.execute('DELETE FROM transactions WHERE id = ? AND profile_id = ?', (tx_id, profile_id))
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/profile/<profile_id>/budgets', methods=['POST'])
def update_budgets(profile_id):
    data = request.json
    if not isinstance(data, dict):
        return jsonify({'error': 'Invalid data format'}), 400
        
    conn = get_db_connection()
    try:
        for cat, val in data.items():
            conn.execute("""
                INSERT INTO budgets (profile_id, category, limit_amount)
                VALUES (?, ?, ?)
                ON CONFLICT(profile_id, category) DO UPDATE SET limit_amount = excluded.limit_amount
            """, (profile_id, cat, float(val)))
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/profile/<profile_id>/theme', methods=['POST'])
def update_theme(profile_id):
    data = request.json
    theme = data.get('theme', 'dark')
    color_theme = data.get('colorTheme', 'midnight')
    
    conn = get_db_connection()
    try:
        conn.execute("""
            INSERT INTO themes (profile_id, theme, color_theme)
            VALUES (?, ?, ?)
            ON CONFLICT(profile_id) DO UPDATE SET theme = excluded.theme, color_theme = excluded.color_theme
        """, (profile_id, theme, color_theme))
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/profile/<profile_id>/reset', methods=['POST'])
def reset_ledger(profile_id):
    conn = get_db_connection()
    try:
        conn.execute('DELETE FROM transactions WHERE profile_id = ?', (profile_id,))
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/profile/<profile_id>', methods=['DELETE'])
def delete_profile(profile_id):
    conn = get_db_connection()
    try:
        conn.execute('DELETE FROM profiles WHERE id = ?', (profile_id,))
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Run server on port 5000 listening on all network interfaces
    app.run(host='0.0.0.0', debug=True, port=5000)
