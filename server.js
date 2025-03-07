const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

// JWT Secret
const JWT_SECRET = 'sj-automotive-secret-key';

// Initialize database
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database');
    createTables();
  }
});

// Create database tables
function createTables() {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Health checks table
  db.run(`CREATE TABLE IF NOT EXISTS health_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_make TEXT NOT NULL,
    vehicle_model TEXT NOT NULL,
    vehicle_year INTEGER NOT NULL,
    vehicle_reg TEXT NOT NULL,
    vehicle_mileage INTEGER NOT NULL,
    vehicle_vin TEXT,
    technician_notes TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users (id)
  )`);

  // Health check items table
  db.run(`CREATE TABLE IF NOT EXISTS health_check_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    health_check_id INTEGER NOT NULL,
    section TEXT NOT NULL,
    item TEXT NOT NULL,
    status TEXT NOT NULL,
    notes TEXT,
    FOREIGN KEY (health_check_id) REFERENCES health_checks (id)
  )`);

  // Create default admin user
  const saltRounds = 10;
  bcrypt.hash('admin123', saltRounds, (err, hash) => {
    if (err) {
      console.error('Error hashing password', err);
    } else {
      db.run(
        `INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)`,
        ['admin', hash, 'admin'],
        function(err) {
          if (err) {
            console.error('Error creating admin user', err.message);
          } else if (this.changes > 0) {
            console.log('Admin user created successfully');
          }
        }
      );
    }
  });
}

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  });
}

// Routes

// Login route
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    bcrypt.compare(password, user.password, (err, result) => {
      if (err || !result) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
      
      // Update last login time
      db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
      
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '8h' }
      );
      
      res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    });
  });
});

// Register route (admin only)
app.post('/api/users', authenticateToken, (req, res) => {
  const { username, password, role, status } = req.body;
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can create users' });
  }
  
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Username, password, and role are required' });
  }
  
  const saltRounds = 10;
  bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
      return res.status(500).json({ error: 'Error hashing password' });
    }
    
    db.run(
      'INSERT INTO users (username, password, role, status) VALUES (?, ?, ?, ?)',
      [username, hash, role, status || 'active'],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Error creating user' });
        }
        
        res.status(201).json({ id: this.lastID, username, role, status: status || 'active' });
      }
    );
  });
});

// Get all health checks
app.get('/api/health-checks', authenticateToken, (req, res) => {
  db.all(`
    SELECT 
      hc.id, hc.vehicle_make, hc.vehicle_model, hc.vehicle_year, 
      hc.vehicle_reg, hc.vehicle_mileage, hc.vehicle_vin, 
      hc.technician_notes, hc.created_at, hc.updated_at,
      u.username as created_by_username
    FROM health_checks hc
    LEFT JOIN users u ON hc.created_by = u.id
    ORDER BY hc.created_at DESC
  `, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json(rows);
  });
});

// Get a specific health check with its items
app.get('/api/health-checks/:id', authenticateToken, (req, res) => {
  const healthCheckId = req.params.id;
  
  db.get(`
    SELECT 
      hc.id, hc.vehicle_make, hc.vehicle_model, hc.vehicle_year, 
      hc.vehicle_reg, hc.vehicle_mileage, hc.vehicle_vin, 
      hc.technician_notes, hc.created_at, hc.updated_at,
      u.username as created_by_username
    FROM health_checks hc
    LEFT JOIN users u ON hc.created_by = u.id
    WHERE hc.id = ?
  `, [healthCheckId], (err, healthCheck) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!healthCheck) {
      return res.status(404).json({ error: 'Health check not found' });
    }
    
    db.all('SELECT * FROM health_check_items WHERE health_check_id = ?', [healthCheckId], (err, items) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      healthCheck.items = items;
      res.json(healthCheck);
    });
  });
});

// Create a new health check
app.post('/api/health-checks', authenticateToken, (req, res) => {
  const { 
    vehicleInfo, 
    healthCheckItems, 
    technicianNotes 
  } = req.body;
  
  if (!vehicleInfo || !healthCheckItems) {
    return res.status(400).json({ error: 'Vehicle info and health check items are required' });
  }
  
  db.run(`
    INSERT INTO health_checks (
      vehicle_make, vehicle_model, vehicle_year, vehicle_reg, 
      vehicle_mileage, vehicle_vin, technician_notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    vehicleInfo.make, 
    vehicleInfo.model, 
    vehicleInfo.year, 
    vehicleInfo.reg, 
    vehicleInfo.mileage, 
    vehicleInfo.vin || null, 
    technicianNotes || null, 
    req.user.id
  ], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error creating health check' });
    }
    
    const healthCheckId = this.lastID;
    
    // Insert health check items
    const insertItem = (item, index) => {
      if (index >= healthCheckItems.length) {
        // All items inserted, return the created health check
        return db.get('SELECT * FROM health_checks WHERE id = ?', [healthCheckId], (err, healthCheck) => {
          if (err) {
            return res.status(500).json({ error: 'Error retrieving created health check' });
          }
          
          res.status(201).json(healthCheck);
        });
      }
      
      const currentItem = healthCheckItems[index];
      
      db.run(`
        INSERT INTO health_check_items (
          health_check_id, section, item, status, notes
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        healthCheckId,
        currentItem.section,
        currentItem.item,
        currentItem.status,
        currentItem.notes || null
      ], (err) => {
        if (err) {
          return res.status(500).json({ error: 'Error creating health check item' });
        }
        
        insertItem(healthCheckItems, index + 1);
      });
    };
    
    insertItem(healthCheckItems, 0);
  });
});

// Update a health check
app.put('/api/health-checks/:id', authenticateToken, (req, res) => {
  const healthCheckId = req.params.id;
  const { 
    vehicleInfo, 
    healthCheckItems, 
    technicianNotes 
  } = req.body;
  
  if (!vehicleInfo || !healthCheckItems) {
    return res.status(400).json({ error: 'Vehicle info and health check items are required' });
  }
  
  db.run(`
    UPDATE health_checks SET
      vehicle_make = ?, 
      vehicle_model = ?, 
      vehicle_year = ?, 
      vehicle_reg = ?, 
      vehicle_mileage = ?, 
      vehicle_vin = ?, 
      technician_notes = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [
    vehicleInfo.make, 
    vehicleInfo.model, 
    vehicleInfo.year, 
    vehicleInfo.reg, 
    vehicleInfo.mileage, 
    vehicleInfo.vin || null, 
    technicianNotes || null,
    healthCheckId
  ], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error updating health check' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Health check not found' });
    }
    
    // Delete existing items
    db.run('DELETE FROM health_check_items WHERE health_check_id = ?', [healthCheckId], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Error updating health check items' });
      }
      
      // Insert updated items
      const insertItem = (item, index) => {
        if (index >= healthCheckItems.length) {
          // All items inserted, return the updated health check
          return db.get('SELECT * FROM health_checks WHERE id = ?', [healthCheckId], (err, healthCheck) => {
            if (err) {
              return res.status(500).json({ error: 'Error retrieving updated health check' });
            }
            
            res.json(healthCheck);
          });
        }
        
        const currentItem = healthCheckItems[index];
        
        db.run(`
          INSERT INTO health_check_items (
            health_check_id, section, item, status, notes
          ) VALUES (?, ?, ?, ?, ?)
        `, [
          healthCheckId,
          currentItem.section,
          currentItem.item,
          currentItem.status,
          currentItem.notes || null
        ], (err) => {
          if (err) {
            return res.status(500).json({ error: 'Error updating health check item' });
          }
          
          insertItem(healthCheckItems, index + 1);
        });
      };
      
      insertItem(healthCheckItems, 0);
    });
  });
});

// Delete a health check
app.delete('/api/health-checks/:id', authenticateToken, (req, res) => {
  const healthCheckId = req.params.id;
  
  // Only admins can delete health checks
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can delete health checks' });
  }
  
  // Delete health check items first
  db.run('DELETE FROM health_check_items WHERE health_check_id = ?', [healthCheckId], (err) => {
    if (err) {
      return res.status(500).json({ error: 'Error deleting health check items' });
    }
    
    // Then delete the health check
    db.run('DELETE FROM health_checks WHERE id = ?', [healthCheckId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error deleting health check' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Health check not found' });
      }
      
      res.json({ message: 'Health check deleted successfully' });
    });
  });
});

// Get all users (admin only)
app.get('/api/users', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can view users' });
  }
  
  db.all(`
    SELECT id, username, role, created_at, 
    CASE 
      WHEN status = 'inactive' THEN 'inactive'
      ELSE 'active'
    END as status
    FROM users
    ORDER BY created_at DESC
  `, [], (err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json(users);
  });
});

// Get a specific user (admin only)
app.get('/api/users/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can view user details' });
  }
  
  const userId = req.params.id;
  
  db.get(`
    SELECT id, username, role, created_at,
    CASE 
      WHEN status = 'inactive' THEN 'inactive'
      ELSE 'active'
    END as status
    FROM users 
    WHERE id = ?
  `, [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  });
});

// Delete a user (admin only)
app.delete('/api/users/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can delete users' });
  }
  
  const userId = req.params.id;
  
  // Prevent deleting the last admin user
  db.get('SELECT COUNT(*) as adminCount FROM users WHERE role = "admin"', [], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (result.adminCount <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last admin user' });
    }
    
    db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error deleting user' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ message: 'User deleted successfully' });
    });
  });
});

// Export the Express API for Vercel
if (process.env.VERCEL) {
  // Export as serverless function
  module.exports = app;
} else {
  // Start the server for local development
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
} 