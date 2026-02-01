import FavoritesPage from "../../../components/shared/leads/FavoritesPage";

export default function AdminFavoritesPage() {
  return (
    <FavoritesPage 
      isAdmin={true} 
      storageKey="leadRabbit_admin_favorites"
    />
  );
}
