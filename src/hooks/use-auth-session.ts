import * as React from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

interface AuthSessionState {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

export function useAuthSession(): AuthSessionState {
  const [state, setState] = React.useState<AuthSessionState>({
    session: null,
    user: null,
    loading: true,
  });

  React.useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        setState({
          session,
          user: session?.user ?? null,
          loading: false,
        });
      },
    );

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setState({
        session: data.session,
        user: data.session?.user ?? null,
        loading: false,
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}