"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  createGooglePlacesSessionToken,
  isGooglePlacesConfigured,
  resolveGoogleAddressSuggestion,
  searchGoogleAddressSuggestions,
  type GooglePlaceSuggestion,
} from "@/src/lib/google-places";
import type { GeocodingResult } from "@/src/lib/geocoding";

export function useGooglePlacesAutocomplete(input: string, enabled = true) {
  const [suggestions, setSuggestions] = useState<GooglePlaceSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const sessionTokenRef = useRef<unknown | null>(null);
  const isConfigured = isGooglePlacesConfigured();

  const ensureSessionToken = useCallback(async (): Promise<unknown> => {
    sessionTokenRef.current ??= await createGooglePlacesSessionToken();

    return sessionTokenRef.current;
  }, []);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    const timer = setTimeout(() => {
      if (!enabled || !isConfigured || input.trim().length < 3) {
        setSuggestions([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      void ensureSessionToken()
        .then((sessionToken) => searchGoogleAddressSuggestions(input, sessionToken))
        .then((nextSuggestions) => {
          if (requestId !== requestIdRef.current) return;
          setSuggestions(nextSuggestions);
        })
        .catch(() => {
          if (requestId !== requestIdRef.current) return;
          setSuggestions([]);
          setError("Could not load address suggestions.");
        })
        .finally(() => {
          if (requestId === requestIdRef.current) setIsLoading(false);
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [enabled, ensureSessionToken, input, isConfigured]);

  async function selectSuggestion(
    suggestion: GooglePlaceSuggestion,
  ): Promise<GeocodingResult | null> {
    const result = await resolveGoogleAddressSuggestion(suggestion);
    sessionTokenRef.current = null;
    setSuggestions([]);

    return result;
  }

  function resetSession() {
    sessionTokenRef.current = null;
    setSuggestions([]);
    setError(null);
  }

  return {
    suggestions,
    isLoading,
    error,
    isConfigured,
    selectSuggestion,
    resetSession,
  };
}
