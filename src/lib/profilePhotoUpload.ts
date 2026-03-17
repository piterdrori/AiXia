import { supabase } from "@/lib/supabase";

type UploadProfilePhotoInput = {
  file: File;
  userId: string;
};

export async function uploadProfilePhoto({
  file,
  userId,
}: UploadProfilePhotoInput) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("User not authenticated.");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed.");
  }

  const timestamp = Date.now();
  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${userId}/${timestamp}_${safeFileName}`;

  const { error: uploadError } = await supabase.storage
    .from("profile-pictures")
    .upload(filePath, file, {
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message || "Failed to upload profile photo.");
  }

  const { data: publicUrlData } = supabase.storage
    .from("profile-pictures")
    .getPublicUrl(filePath);

  const publicUrl = publicUrlData?.publicUrl;

  if (!publicUrl) {
    throw new Error("Failed to get profile photo URL.");
  }

  return {
    filePath,
    publicUrl,
  };
}

export async function deleteProfilePhoto(filePath: string) {
  const { error } = await supabase.storage
    .from("profile-pictures")
    .remove([filePath]);

  if (error) {
    throw new Error(error.message || "Failed to delete profile photo.");
  }
}
