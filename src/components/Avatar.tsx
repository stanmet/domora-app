// Аватар пользователя: фото (avatarUrl) или буква-инициал имени как запасной вид.
// Серверный компонент без состояния - можно использовать где угодно.

export default function Avatar({
  url,
  name,
  size = 40,
}: {
  url?: string | null;
  name?: string | null;
  size?: number;
}) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        className="avatar"
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", padding: 0 }}
      />
    );
  }
  return (
    <span className="avatar" style={{ width: size, height: size }}>
      {(name?.[0] ?? "?").toUpperCase()}
    </span>
  );
}
