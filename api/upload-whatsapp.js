const { supabase, verifyToken, corsHeaders } = require('./_lib/supabase');

module.exports = async (req, res) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(200).end();
  }
  
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
  
  // Verify admin authentication
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const payload = verifyToken(token);
  if (!payload || payload.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // For Vercel, we'll receive the file content as base64 or text
    const { fileContent, filename } = req.body;
    
    if (!fileContent || !filename) {
      return res.status(400).json({ error: 'No file content or filename provided' });
    }
    
    // Decode if base64
    let textContent;
    try {
      textContent = Buffer.from(fileContent, 'base64').toString('utf8');
    } catch {
      textContent = fileContent; // Already text
    }
    
    if (!textContent || textContent.trim().length === 0) {
      return res.status(400).json({ error: 'File is empty' });
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueFilename = `${timestamp}_${safeName}`;
    const filePath = `${payload.username}/${uniqueFilename}`;
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('whatsapp-chats')
      .upload(filePath, textContent, {
        contentType: 'text/plain',
        upsert: false
      });
    
    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload file: ' + uploadError.message });
    }
    
    // Record upload in database
    const { data: uploadRecord, error: recordError } = await supabase
      .from('chat_uploads')
      .insert([{
        filename: filename,
        file_path: filePath,
        uploaded_by: payload.username,
        status: 'pending'
      }])
      .select()
      .single();
    
    if (recordError) {
      console.error('Database record error:', recordError);
      return res.status(500).json({ error: 'Failed to record upload: ' + recordError.message });
    }
    
    // Return success with upload ID
    return res.status(200).json({
      success: true,
      message: 'File uploaded successfully. Processing will start shortly.',
      uploadId: uploadRecord.id,
      filename: filename
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: error.message });
  }
};
