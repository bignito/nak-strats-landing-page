import Result "mo:core/Result";
import List "mo:core/List";
import Types "../types/storefront";
import AdminTypes "../types/admin-access-control";
import AdminLib "../lib/admin-access-control";
import CategoriesLib "../lib/categories";

mixin (
  categories : List.List<Types.Category>,
  products : List.List<Types.Product>,
  adminUsers : AdminTypes.AdminUsers,
) {
  // Public, anonymous: returns active categories sorted by sortOrder, each with
  // a productCount of visible (active, non-admin_only) products.
  public query func listCategories() : async [Types.CategoryWithCount] {
    CategoriesLib.listCategories(categories, products);
  };

  // Admin-gated (AdminLib.requireAdminOrOwner): create a category. The slug is
  // auto-generated from name and rejected on collision or empty.
  public shared ({ caller }) func createCategory(name : Text, description : ?Text) : async Result.Result<Types.Category, Types.CategoryError> {
    AdminLib.requireAdminOrOwner(adminUsers, caller);
    CategoriesLib.createCategory(categories, name, description);
  };

  // Admin-gated (AdminLib.requireAdminOrOwner): update name, description,
  // sortOrder, active, showWhenEmpty. The slug is NOT editable.
  public shared ({ caller }) func updateCategory(
    id : Types.CategoryId,
    name : Text,
    description : ?Text,
    sortOrder : Nat,
    active : Bool,
    showWhenEmpty : Bool,
  ) : async Result.Result<Types.Category, Types.CategoryError> {
    AdminLib.requireAdminOrOwner(adminUsers, caller);
    CategoriesLib.updateCategory(categories, id, name, description, sortOrder, active, showWhenEmpty);
  };

  // Admin-gated (AdminLib.requireAdminOrOwner): reorder categories to match the
  // supplied ordered array of ids.
  public shared ({ caller }) func reorderCategories(orderedIds : [Types.CategoryId]) : async Result.Result<(), Types.CategoryError> {
    AdminLib.requireAdminOrOwner(adminUsers, caller);
    CategoriesLib.reorderCategories(categories, orderedIds);
  };

  // Admin-gated (AdminLib.requireAdminOrOwner): delete a category. Refuses (with
  // an error naming the count) when any product still references the slug.
  public shared ({ caller }) func deleteCategory(id : Types.CategoryId) : async Result.Result<(), Types.CategoryError> {
    AdminLib.requireAdminOrOwner(adminUsers, caller);
    CategoriesLib.deleteCategory(categories, products, id);
  };

  // Admin-gated (AdminLib.requireAdminOrOwner): reassign products from one slug
  // to another so an admin can clear a category before deleting it.
  public shared ({ caller }) func reassignProducts(fromSlug : Text, toSlug : Text) : async Result.Result<Nat, Types.CategoryError> {
    AdminLib.requireAdminOrOwner(adminUsers, caller);
    CategoriesLib.reassignProducts(categories, products, fromSlug, toSlug);
  };
};
