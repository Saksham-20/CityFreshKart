const express = require('express');
const { query } = require('../database/config');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/addresses
// @desc    Get user's saved addresses
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM user_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
      [req.user.id],
    );
    res.json({ success: true, data: { addresses: result.rows } });
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
});

// @route   POST /api/addresses
// @desc    Add a new address
// @access  Private
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      firstName, first_name, lastName, last_name,
      addressLine, address_line,
      houseNumber, house_number,
      floor, society, sector,
      city, state, postalCode, postal_code, phone, isDefault, is_default,
    } = req.body;

    const fname = firstName || first_name;
    const lname = lastName || last_name || '';
    const line1 = addressLine || address_line;
    const houseNo = houseNumber || house_number;
    const zip = postalCode || postal_code;
    const floorValue = floor || '';
    const societyValue = society || '';
    const sectorValue = sector || '';
    const deflt = isDefault !== undefined ? isDefault : (is_default || false);

    if (!line1 || !houseNo) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Address line and house number are required' },
      });
    }

    // If setting as default, clear other defaults
    if (deflt) {
      await query(
        'UPDATE user_addresses SET is_default = false WHERE user_id = $1',
        [req.user.id],
      );
    }

    const result = await query(`
      INSERT INTO user_addresses (
        user_id, first_name, last_name, address_line,
        house_number, floor, society, sector,
        city, state, postal_code,
        phone, is_default
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      req.user.id,
      fname,
      lname,
      line1,
      houseNo,
      floorValue,
      societyValue,
      sectorValue,
      city || 'N/A',
      state || 'N/A',
      zip || '000000',
      phone || '',
      deflt,
    ]);

    res.status(201).json({ success: true, data: { address: result.rows[0] } });
  } catch (error) {
    console.error('Add address error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
});

// @route   PUT /api/addresses/:id
// @desc    Update an address
// @access  Private
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName, first_name, lastName, last_name,
      addressLine, address_line,
      houseNumber, house_number,
      floor, society, sector,
      city, state, postalCode, postal_code,
      phone, isDefault, is_default,
    } = req.body;

    const fname = firstName || first_name;
    const lname = lastName || last_name || '';
    const line1 = addressLine || address_line;
    const houseNo = houseNumber !== undefined ? houseNumber : house_number;
    const floorValue = floor !== undefined ? floor : undefined;
    const societyValue = society !== undefined ? society : undefined;
    const sectorValue = sector !== undefined ? sector : undefined;
    const zip = postalCode || postal_code;
    const deflt = isDefault !== undefined ? isDefault : is_default;

    // Verify ownership
    const existing = await query('SELECT id FROM user_addresses WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Address not found' } });
    }

    if (deflt) {
      await query(
        'UPDATE user_addresses SET is_default = false WHERE user_id = $1',
        [req.user.id],
      );
    }

    const result = await query(`
      UPDATE user_addresses
      SET first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          address_line = COALESCE($3, address_line),
          house_number = COALESCE($4, house_number),
          floor = COALESCE($5, floor),
          society = COALESCE($6, society),
          sector = COALESCE($7, sector),
          city = COALESCE($8, city),
          state = COALESCE($9, state),
          postal_code = COALESCE($10, postal_code),
          phone = COALESCE($11, phone),
          is_default = COALESCE($12, is_default),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $13 AND user_id = $14
      RETURNING *
    `, [fname, lname, line1, houseNo, floorValue, societyValue, sectorValue, city, state, zip, phone, deflt, id, req.user.id]);

    res.json({ success: true, data: { address: result.rows[0] } });
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
});

// @route   DELETE /api/addresses/:id
// @desc    Delete an address
// @access  Private
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      'DELETE FROM user_addresses WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Address not found' } });
    }

    res.json({ success: true, data: { message: 'Address deleted successfully' } });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
});

module.exports = router;
