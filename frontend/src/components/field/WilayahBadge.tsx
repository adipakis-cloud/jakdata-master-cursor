import { AuthStorage } from '../../lib/auth';

type Props = {
  /** Optional labels from `/wilayah/rt` + parent (avoids extra fetch). */
  rtInfo?: {
    nomor?: string;
    rw?: { nomor?: string; kelurahan?: { nama?: string } };
  } | null;
};

export function WilayahBadge({ rtInfo }: Props) {
  const user = AuthStorage.getUser();
  if (!user) return null;

  const rtNum = rtInfo?.nomor ?? (user.rtId != null ? String(user.rtId) : '—');
  const rwNum = rtInfo?.rw?.nomor ?? (user.rwId != null ? String(user.rwId) : '—');
  const kel = rtInfo?.rw?.kelurahan?.nama ?? (user.kelurahanId != null ? `Kelurahan #${user.kelurahanId}` : 'Wilayah');

  return (
    <div
      className="inline-flex max-w-full items-center rounded-full bg-[#eff6ff] px-[10px] py-1 text-[12px] font-medium text-[#1d4ed8]"
      style={{ lineHeight: 1.3 }}
    >
      <span className="truncate">
        📍 RT {rtNum} / RW {rwNum} — {kel}
      </span>
    </div>
  );
}
