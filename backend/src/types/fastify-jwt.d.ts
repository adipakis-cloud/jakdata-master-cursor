import '@fastify/jwt';

/** JWT payload after `jwt.sign` in auth and `jwtVerify` on protected routes. */
export type JakdataJwtPayload = {
  sub: number;
  userId: number;
  email: string;
  role: string;
  nama: string;
  wilayahId: number | null;
  wilayahType: string | null;
  kotaId?: number | null;
  kecamatanId?: number | null;
  kelurahanId?: number | null;
  rwId?: number | null;
  rtId?: number | null;
  warmindoId?: number | null;
};

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JakdataJwtPayload;
    user: JakdataJwtPayload;
  }
}
