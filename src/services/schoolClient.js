import { supabase } from "./supabaseClient.js";

export async function createSchool({ name, city, state, cnpj, phone, address, admin_user_id }) {
  const { data, error } = await supabase
    .from("schools")
    .insert([{ name, city, state, cnpj, phone, address, admin_user_id }])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getSchools() {
  const { data, error } = await supabase
    .from("schools")
    .select("*")
    .order("name");

  if (error) throw new Error(error.message);
  return data;
}

export async function createTeacher({ user_id, school_id, full_name, email, phone, specialization }) {
  const { data, error } = await supabase
    .from("teachers")
    .insert([{ user_id, school_id, full_name, email, phone, specialization }])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createStudent({ school_id, full_name, birth_date, grade, turma, observable_behavior, what_helps, disability_type, guardian_name, guardian_phone, notes }) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("students")
    .insert([{
      school_id, full_name, birth_date, grade,
      turma: turma || null,
      observable_behavior: observable_behavior || null,
      what_helps: what_helps || null,
      disability_type, guardian_name, guardian_phone, notes,
      created_by: user?.id || null
    }])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getStudents(school_id) {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("school_id", school_id)
    .order("full_name");

  if (error) throw new Error(error.message);
  return data;
}