import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { Button } from '../components/Button';

// Villes principales par pays
const CITIES_BY_COUNTRY: Record<string, string[]> = {
  'FR': ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Bordeaux', 'Lille', 'Nice', 'Nantes', 'Strasbourg', 'Rennes'],
  'DE': ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne', 'Stuttgart', 'Düsseldorf', 'Dortmund', 'Leipzig', 'Dresden'],
  'ES': ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Bilbao', 'Málaga', 'Saragosse', 'Alicante', 'Murcia', 'Palma'],
  'IT': ['Rome', 'Milan', 'Naples', 'Turin', 'Palerme', 'Gênes', 'Bologne', 'Florence', 'Venise', 'Vérone'],
  'GB': ['Londres', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow', 'Liverpool', 'Newcastle', 'Sheffield', 'Bristol', 'Edinburgh'],
  'NL': ['Amsterdam', 'Rotterdam', 'La Haye', 'Utrecht', 'Eindhoven', 'Tilburg', 'Groningen', 'Almere', 'Breda', 'Nimègue'],
  'BE': ['Bruxelles', 'Anvers', 'Gand', 'Charleroi', 'Liège', 'Bruges', 'Namur', 'Louvain', 'Mons', 'Malines'],
  'CH': ['Zurich', 'Genève', 'Bâle', 'Berne', 'Lausanne', 'Winterthour', 'Lucerne', 'Saint-Gall', 'Lugano', 'Bienne'],
  'AT': ['Vienne', 'Graz', 'Linz', 'Salzbourg', 'Innsbruck', 'Klagenfurt', 'Villach', 'Wels', 'Sankt Pölten', 'Dornbirn'],
  'PT': ['Lisbonne', 'Porto', 'Amadora', 'Braga', 'Setúbal', 'Coimbra', 'Queluz', 'Funchal', 'Cacém', 'Vila Nova de Gaia'],
  'LU': ['Luxembourg', 'Esch-sur-Alzette', 'Differdange', 'Dudelange', 'Pétange', 'Sanem', 'Hesperange', 'Bettembourg', 'Schifflange', 'Ettelbruck'],
  'IE': ['Dublin', 'Cork', 'Limerick', 'Galway', 'Waterford', 'Drogheda', 'Dundalk', 'Swords', 'Bray', 'Navan'],
  'SE': ['Stockholm', 'Göteborg', 'Malmö', 'Uppsala', 'Västerås', 'Örebro', 'Linköping', 'Helsingborg', 'Jönköping', 'Norrköping'],
  'DK': ['Copenhague', 'Aarhus', 'Odense', 'Aalborg', 'Frederiksberg', 'Esbjerg', 'Randers', 'Kolding', 'Horsens', 'Vejle'],
  'NO': ['Oslo', 'Bergen', 'Stavanger', 'Trondheim', 'Drammen', 'Fredrikstad', 'Kristiansand', 'Sandnes', 'Tromsø', 'Sarpsborg'],
  'FI': ['Helsinki', 'Espoo', 'Tampere', 'Vantaa', 'Oulu', 'Turku', 'Jyväskylä', 'Lahti', 'Kuopio', 'Pori'],
  'PL': ['Varsovie', 'Cracovie', 'Łódź', 'Wrocław', 'Poznań', 'Gdańsk', 'Szczecin', 'Bydgoszcz', 'Lublin', 'Katowice']
};

// Drapeaux par code pays
const FLAGS: Record<string, string> = {
  'DE': '🇩🇪', 'AT': '🇦🇹', 'BE': '🇧🇪', 'DK': '🇩🇰', 'ES': '🇪🇸', 
  'FI': '🇫🇮', 'FR': '🇫🇷', 'IE': '🇮🇪', 'IT': '🇮🇹', 'LU': '🇱🇺',
  'NO': '🇳🇴', 'NL': '🇳🇱', 'PL': '🇵🇱', 'PT': '🇵🇹', 'GB': '🇬🇧',
  'SE': '🇸🇪', 'CH': '🇨🇭'
};

interface Country {
  code: string;
  name: string;
  language: string;
  adzuna_api_endpoint: string | null;
}

export const SearchPreferences = () => {
  const { user } = useAuth();
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Charger les pays disponibles
      const { data: countriesData, error: countriesError } = await supabase
        .from('countries')
        .select('*')
        .eq('active', true)
        .order('name');

      if (countriesError) {
        console.error('Erreur countries:', countriesError);
        alert('Erreur: La table "countries" n\'existe pas. Exécutez le script SQL dans Supabase.');
        return;
      }

      setCountries(countriesData || []);

      // Charger les préférences utilisateur
      // @ts-ignore - Supabase type inference issue
      const { data: userData, error: userError } = await (supabase
        .from('users') as any)
        .select('target_countries, target_cities')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('Erreur user:', userError);
        // Pas grave si les colonnes n'existent pas encore, on continue
      }

      if (userData) {
        setSelectedCountries(userData.target_countries || []);
        setSelectedCities(userData.target_cities || {});
      }
    } catch (error: any) {
      console.error('Erreur chargement:', error);
      alert('Erreur: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleCountry = (countryCode: string) => {
    if (selectedCountries.includes(countryCode)) {
      // Retirer le pays et ses villes
      setSelectedCountries(prev => prev.filter(c => c !== countryCode));
      setSelectedCities(prev => {
        const updated = { ...prev };
        delete updated[countryCode];
        return updated;
      });
    } else {
      // Ajouter le pays
      setSelectedCountries(prev => [...prev, countryCode]);
    }
  };

  const toggleCity = (countryCode: string, city: string) => {
    setSelectedCities(prev => {
      const countryCities = prev[countryCode] || [];
      if (countryCities.includes(city)) {
        // Retirer la ville
        return {
          ...prev,
          [countryCode]: countryCities.filter(c => c !== city)
        };
      } else {
        // Ajouter la ville
        return {
          ...prev,
          [countryCode]: [...countryCities, city]
        };
      }
    });
  };

  const selectAllCities = (countryCode: string) => {
    const allCities = CITIES_BY_COUNTRY[countryCode] || [];
    setSelectedCities(prev => ({
      ...prev,
      [countryCode]: allCities
    }));
  };

  const savePreferences = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // @ts-ignore - Supabase type inference issue
      const { error } = await (supabase
        .from('users') as any)
        .update({
          target_countries: selectedCountries,
          target_cities: selectedCities
        })
        .eq('id', user.id);

      if (error) throw error;

      alert('Préférences sauvegardées ! 🎉');
    } catch (error: any) {
      console.error('Erreur sauvegarde:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Préférences de Recherche 🌍
        </h1>
        <p className="text-gray-600">
          Sélectionnez les pays et les villes où vous souhaitez rechercher des offres d'emploi
        </p>
      </div>

      {/* Sélection des pays */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Pays ciblés</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {countries.map(country => (
            <button
              key={country.code}
              onClick={() => toggleCountry(country.code)}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedCountries.includes(country.code)
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="text-4xl mb-2">{FLAGS[country.code]}</div>
              <div className="font-semibold text-sm">{country.name}</div>
              {!country.adzuna_api_endpoint && (
                <div className="text-xs text-orange-600 mt-1">
                  API limitée
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Sélection des villes par pays */}
      {selectedCountries.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Villes par pays</h2>
          {selectedCountries.map(countryCode => {
            const country = countries.find(c => c.code === countryCode);
            const cities = CITIES_BY_COUNTRY[countryCode] || [];
            const selectedCitiesForCountry = selectedCities[countryCode] || [];

            return (
              <div key={countryCode} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <span className="text-2xl">{FLAGS[countryCode]}</span>
                    {country?.name}
                  </h3>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => selectAllCities(countryCode)}
                  >
                    Tout sélectionner
                  </Button>
                </div>

                {cities.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    Aucune ville prédéfinie. Toutes les villes seront incluses.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                    {cities.map(city => (
                      <button
                        key={city}
                        onClick={() => toggleCity(countryCode, city)}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          selectedCitiesForCountry.includes(city)
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                )}

                {selectedCitiesForCountry.length === 0 && cities.length > 0 && (
                  <p className="text-sm text-orange-600 mt-3">
                    ℹ️ Aucune ville sélectionnée = toutes les villes de {country?.name}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Bouton de sauvegarde */}
      <div className="mt-8 flex justify-end gap-4">
        <Button
          variant="secondary"
          onClick={loadData}
        >
          Annuler
        </Button>
        <Button
          onClick={savePreferences}
          isLoading={saving}
          disabled={selectedCountries.length === 0}
        >
          Sauvegarder les préférences
        </Button>
      </div>

      {/* Résumé */}
      {selectedCountries.length > 0 && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Résumé de votre recherche :</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>📍 <strong>{selectedCountries.length}</strong> pays sélectionnés</li>
            <li>🏙️ <strong>{Object.values(selectedCities).flat().length}</strong> villes ciblées</li>
            <li>
              🔍 Les offres seront automatiquement recherchées dans ces zones
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};
