import FavoritesPage from "../../../components/shared/leads/FavoritesPage";

export default function UserFavoritesPage() {
  return (
    <FavoritesPage 
      isAdmin={false} 
      storageKey="leadRabbit_favorites"
    />
  );
}
