import { USERS, useUser } from "../context/UserContext";

export function ActingAs() {
  const { userName, setUserName } = useUser();

  return (
    <div className="acting-as">
      <label htmlFor="acting-as">Acting as</label>
      <select
        id="acting-as"
        value={userName}
        onChange={(e) => setUserName(e.target.value)}
      >
        {USERS.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}
