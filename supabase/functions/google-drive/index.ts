import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  thumbnailLink?: string;
  size?: string;
  parents?: string[];
}

async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  const refreshToken = Deno.env.get('GOOGLE_REFRESH_TOKEN');

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google OAuth credentials not configured');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Token refresh error:', error);
    throw new Error('Failed to refresh access token');
  }

  const data = await response.json();
  return data.access_token;
}

async function listFiles(accessToken: string, folderId?: string, query?: string): Promise<DriveFile[]> {
  let q = "trashed = false";
  if (folderId) {
    q += ` and '${folderId}' in parents`;
  }
  if (query) {
    q += ` and name contains '${query}'`;
  }

  const params = new URLSearchParams({
    q,
    fields: 'files(id,name,mimeType,webViewLink,thumbnailLink,size,parents)',
    pageSize: '100',
    orderBy: 'name',
  });

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?${params}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('List files error:', error);
    throw new Error('Failed to list files');
  }

  const data = await response.json();
  return data.files || [];
}

async function createFolder(accessToken: string, name: string, parentId?: string): Promise<DriveFile> {
  const metadata: Record<string, unknown> = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
  };

  if (parentId) {
    metadata.parents = [parentId];
  }

  const response = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Create folder error:', error);
    throw new Error('Failed to create folder');
  }

  return await response.json();
}

async function getFileMetadata(accessToken: string, fileId: string): Promise<DriveFile> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,webViewLink,thumbnailLink,size,parents`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('Get file metadata error:', error);
    throw new Error('Failed to get file metadata');
  }

  return await response.json();
}

async function uploadFile(
  accessToken: string,
  name: string,
  content: string,
  mimeType: string,
  parentId?: string
): Promise<DriveFile> {
  const metadata: Record<string, unknown> = { name };
  if (parentId) {
    metadata.parents = [parentId];
  }

  // Use resumable upload for reliability
  const initResponse = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': mimeType,
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!initResponse.ok) {
    const error = await initResponse.text();
    console.error('Upload init error:', error);
    throw new Error('Failed to initiate upload');
  }

  const uploadUrl = initResponse.headers.get('Location');
  if (!uploadUrl) {
    throw new Error('No upload URL returned');
  }

  // Decode base64 content
  const binaryContent = Uint8Array.from(atob(content), (c) => c.charCodeAt(0));

  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': mimeType,
      'Content-Length': binaryContent.length.toString(),
    },
    body: binaryContent,
  });

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text();
    console.error('Upload error:', error);
    throw new Error('Failed to upload file');
  }

  const file = await uploadResponse.json();
  
  // Get full metadata with webViewLink
  return await getFileMetadata(accessToken, file.id);
}

async function deleteFile(accessToken: string, fileId: string): Promise<void> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok && response.status !== 204) {
    const error = await response.text();
    console.error('Delete file error:', error);
    throw new Error('Failed to delete file');
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub;

    // Check if user is admin or instructor
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    const isAllowed = ['superadmin', 'admin', 'instructor'].includes(roleData?.role || '');
    
    const body = await req.json();
    const { action, folderId, query, name, parentId, fileId, content, mimeType } = body;

    // Students can only browse for enrolled content
    if (!isAllowed && action !== 'list') {
      return new Response(JSON.stringify({ error: 'Permission denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessToken = await getAccessToken();
    let result: unknown;

    switch (action) {
      case 'list':
        result = await listFiles(accessToken, folderId, query);
        break;
      case 'create-folder':
        if (!name) throw new Error('Folder name is required');
        result = await createFolder(accessToken, name, parentId);
        break;
      case 'get-file':
        if (!fileId) throw new Error('File ID is required');
        result = await getFileMetadata(accessToken, fileId);
        break;
      case 'upload':
        if (!name || !content || !mimeType) {
          throw new Error('Name, content, and mimeType are required for upload');
        }
        result = await uploadFile(accessToken, name, content, mimeType, parentId);
        break;
      case 'delete':
        if (!fileId) throw new Error('File ID is required');
        await deleteFile(accessToken, fileId);
        result = { success: true };
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`Drive action ${action} completed for user ${userId}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Google Drive error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
