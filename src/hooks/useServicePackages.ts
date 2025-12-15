import { useQuery } from "@tanstack/react-query";
import { CARFIX_API_URL, CARFIX_ANON_KEY } from "@/lib/carfix-api";
import { ServicePackagesApiResponse } from "@/types/servicePackage";

export const useServicePackages = (vehicleId: string | number | null) => {
  const numericVehicleId = vehicleId ? Number(vehicleId) : null;
  
  return useQuery<ServicePackagesApiResponse>({
    queryKey: ['service-packages', numericVehicleId],
    queryFn: async () => {
      const response = await fetch(
        `${CARFIX_API_URL}/calculate-service-bundles`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': CARFIX_ANON_KEY
          },
          body: JSON.stringify({ vehicleId: numericVehicleId })
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch service packages: ${response.status}`);
      }
      
      return response.json();
    },
    enabled: !!numericVehicleId && !isNaN(numericVehicleId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
