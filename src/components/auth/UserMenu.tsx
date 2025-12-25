import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LogOut, User, Shield, UserCog } from 'lucide-react';

export const UserMenu = () => {
  const { user, userProfile, userRole, signOut, isAdmin, isAbteilungsleiter } = useAuth();

  if (!user) return null;

  const initials = userProfile?.name
    ? userProfile.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email?.slice(0, 2).toUpperCase() || 'U';

  const getRoleBadge = () => {
    if (isAdmin) {
      return (
        <Badge variant="default" className="bg-destructive/20 text-destructive border-destructive/30">
          <Shield className="h-3 w-3 mr-1" />
          Admin
        </Badge>
      );
    }
    if (isAbteilungsleiter) {
      return (
        <Badge variant="default" className="bg-primary/20 text-primary border-primary/30">
          <UserCog className="h-3 w-3 mr-1" />
          Abteilungsleiter
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <User className="h-3 w-3 mr-1" />
        Mitarbeiter
      </Badge>
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10 border-2 border-primary/30">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <p className="text-sm font-medium leading-none">
              {userProfile?.name || 'Benutzer'}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
            {userProfile?.abteilung && (
              <p className="text-xs text-muted-foreground">
                {userProfile.abteilung}
              </p>
            )}
            <div className="pt-1">
              {getRoleBadge()}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={signOut}
          className="text-destructive focus:text-destructive cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Abmelden
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
