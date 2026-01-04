import { useUser, useClerk } from "@clerk/clerk-react";

export function useAuth() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();

  return {
    user: isSignedIn ? {
      id: user.id,
      email: user.primaryEmailAddress?.emailAddress || "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      profileImageUrl: user.imageUrl || "",
    } : null,
    isLoading: !isLoaded,
    isAuthenticated: !!isSignedIn,
    logout: () => signOut(),
    isLoggingOut: false,
  };
}
