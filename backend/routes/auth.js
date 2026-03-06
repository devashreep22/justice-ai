import express from 'express';
import { supabase, supabaseAuth } from '../server.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Signup endpoint
router.post('/signup', async (req, res) => {
  console.log('SIGNUP_ENDPOINT_CALLED_12345', req.body);
  try {
    const { email, password, fullName, userType, ...otherProfileData } = req.body;

    // Validate input
    if (!email || !password || !userType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate user type
    const validUserTypes = ['admin', 'lawyer', 'police'];
    if (!validUserTypes.includes(userType)) {
      return res.status(400).json({ error: 'Invalid user type' });
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      console.log('Auth error detected:', authError);
      return res.status(400).json({ error: authError.message });
    }

    console.log('Auth successful, user created:', authData.user.id);

    // Prepare profile data based on user type
    let profileData = {
      id: authData.user.id,
      email,
      full_name: fullName,
      user_type: userType,
    };

    if (userType === 'police') {
      profileData = {
        ...profileData,
        phone: otherProfileData.phone || null,
        aadhar_id: otherProfileData.aadharId || null,
        department: otherProfileData.station || null,
        badge_number: otherProfileData.badgeNumber || null,
        city: otherProfileData.city || null,
        state: otherProfileData.state || null,
        address: otherProfileData.address || null,
        approval_status: 'pending'
      };
    } else if (userType === 'lawyer') {
      profileData = {
        ...profileData,
        phone: otherProfileData.phone || null,
        aadhar_id: otherProfileData.aadharId || null,
        license_number: otherProfileData.licenseNumber || null,
        specialization: otherProfileData.specialization || null,
        bar_council: otherProfileData.barCouncil || null,
        experience_years: otherProfileData.experienceYears ? parseInt(otherProfileData.experienceYears, 10) : null,
        city: otherProfileData.city || null,
        state: otherProfileData.state || null,
        address: otherProfileData.address || null,
        hourly_rate: otherProfileData.hourlyRate ? parseFloat(otherProfileData.hourlyRate) : null,
        bio: otherProfileData.bio || null,
        approval_status: 'pending'
      };
    }

    // Insert user profile into users table
    const { error: userError } = await supabase
      .from('users')
      .insert(profileData);

    if (userError) {
      console.error('User profile insertion error:', userError);
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: authData.user.id, email, userType },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: authData.user.id,
        email,
        fullName,
        userType,
      },
      token,
    });
  } catch (error) {
    console.error('Signup error - Full stack:', error);
    console.error('Signup error - Message:', error.message);
    console.error('Signup error - Stack:', error.stack);
    res.status(500).json({ 
      error: `Signup error: ${error.message}`,
      details: error.toString()
    });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Authenticate user
    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Fetch user profile
    let { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    if (userError) {
      console.error('User fetch error:', userError);
      return res.status(500).json({ error: 'Unable to load user profile' });
    }

    if (!userData) {
      // Backfill missing admin profile for legacy accounts.
      const isAdminEmail = email.toLowerCase().endsWith('@justiceai.com');
      if (!isAdminEmail) {
        return res.status(404).json({ error: 'User profile not found' });
      }

      const inferredName =
        data.user.user_metadata?.full_name ||
        email.split('@')[0];

      const { data: insertedProfile, error: insertError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email,
          full_name: inferredName,
          user_type: 'admin',
        })
        .select('*')
        .single();

      if (insertError) {
        console.error('Profile backfill error:', insertError);
        return res.status(500).json({ error: 'Unable to create missing user profile' });
      }

      userData = insertedProfile;
    }

    // Police/Lawyer accounts must be approved by admin before login access.
    if (
      ['police', 'lawyer'].includes(userData.user_type) &&
      userData.approval_status !== 'approved'
    ) {
      return res.status(403).json({
        error: `Account ${userData.approval_status || 'pending'} by admin`,
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: data.user.id, email, userType: userData.user_type },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: data.user.id,
        email,
        fullName: userData.full_name,
        userType: userData.user_type,
        approvalStatus: userData.approval_status || null,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Logout endpoint
router.post('/logout', async (req, res) => {
  try {
    res.json({ message: 'Logout successful' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ user: decoded });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
