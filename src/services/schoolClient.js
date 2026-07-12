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

export async function createStudent({ school_id, full_name, birth_date, grade, turma, endereco, observable_behavior, what_helps, historico_escolar, disability_type, deficiencia_hipotese, sistema_linguistico, recursos_acessibilidade, atividades_adaptacoes, implicacoes_curriculares, guardian_name, guardian_phone, notes }) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("students")
    .insert([{
      school_id, full_name, birth_date, grade,
      turma: turma || null,
      endereco: endereco || null,
      observable_behavior: observable_behavior || null,
      what_helps: what_helps || null,
      historico_escolar: historico_escolar || null,
      disability_type,
      deficiencia_hipotese: deficiencia_hipotese || null,
      sistema_linguistico: sistema_linguistico || null,
      recursos_acessibilidade: recursos_acessibilidade || null,
      atividades_adaptacoes: atividades_adaptacoes || null,
      implicacoes_curriculares: implicacoes_curriculares || null,
      guardian_name, guardian_phone, notes,
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