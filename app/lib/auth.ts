
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";

export function getAuthSession() {
    return getServerSession(authOptions);
}