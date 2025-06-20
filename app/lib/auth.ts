
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/auth-options";

export function getAuthSession() {
    return getServerSession(authOptions);
}