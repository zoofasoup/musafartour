import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Loader2, Plus, Edit, Trash2, Save, Trophy, Award, Gift, 
  Target, Calendar, DollarSign, Star, Users, Zap, Shield, 
  Medal, Crown, Flame, Heart, Sparkles
} from "lucide-react";

// Icon mapping for badges
const iconMap: Record<string, React.ElementType> = {
  trophy: Trophy,
  award: Award,
  star: Star,
  medal: Medal,
  crown: Crown,
  flame: Flame,
  heart: Heart,
  target: Target,
  zap: Zap,
  shield: Shield,
  sparkles: Sparkles,
  gift: Gift,
  users: Users,
};

const iconOptions = Object.keys(iconMap);

interface Challenge {
  id: string;
  title: string;
  description: string;
  reward_type: string;
  reward_value: string;
  target_type: string;
  target_value: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface AgentBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement_type: string;
  requirement_value: number;
  points_reward: number;
}

interface Reward {
  id: string;
  name: string;
  description: string;
  category: string;
  points_cost: number;
  stock: number | null;
  image_url: string | null;
  is_active: boolean;
}

const Gamification = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("challenges");

  // Challenges state
  const [challengeDialogOpen, setChallengeDialogOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [challengeForm, setChallengeForm] = useState({
    title: "",
    description: "",
    reward_type: "cash",
    reward_value: "",
    target_type: "sales",
    target_value: 1,
    start_date: "",
    end_date: "",
    is_active: true,
  });

  // Badges state
  const [badgeDialogOpen, setBadgeDialogOpen] = useState(false);
  const [editingBadge, setEditingBadge] = useState<AgentBadge | null>(null);
  const [badgeForm, setBadgeForm] = useState({
    name: "",
    description: "",
    icon: "award",
    requirement_type: "sales_count",
    requirement_value: 1,
    points_reward: 100,
  });

  // Rewards state
  const [rewardDialogOpen, setRewardDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [rewardForm, setRewardForm] = useState({
    name: "",
    description: "",
    category: "merchandise",
    points_cost: 100,
    stock: null as number | null,
    image_url: "",
    is_active: true,
  });

  // Fetch queries
  const { data: challenges = [], isLoading: loadingChallenges } = useQuery({
    queryKey: ["admin-challenges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_challenges")
        .select("*")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data as Challenge[];
    },
  });

  const { data: badges = [], isLoading: loadingBadges } = useQuery({
    queryKey: ["admin-badges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_badges")
        .select("*")
        .order("requirement_value", { ascending: true });
      if (error) throw error;
      return data as AgentBadge[];
    },
  });

  const { data: rewards = [], isLoading: loadingRewards } = useQuery({
    queryKey: ["admin-rewards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_rewards")
        .select("*")
        .order("points_cost", { ascending: true });
      if (error) throw error;
      return data as Reward[];
    },
  });

  // Challenge mutations
  const saveChallengeMutation = useMutation({
    mutationFn: async (data: typeof challengeForm & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from("agent_challenges")
          .update(data)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("agent_challenges").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-challenges"] });
      toast.success(editingChallenge ? "Challenge updated!" : "Challenge created!");
      setChallengeDialogOpen(false);
      resetChallengeForm();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteChallengeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("agent_challenges").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-challenges"] });
      toast.success("Challenge deleted!");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Badge mutations
  const saveBadgeMutation = useMutation({
    mutationFn: async (data: typeof badgeForm & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from("agent_badges")
          .update(data)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("agent_badges").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-badges"] });
      toast.success(editingBadge ? "Badge updated!" : "Badge created!");
      setBadgeDialogOpen(false);
      resetBadgeForm();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteBadgeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("agent_badges").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-badges"] });
      toast.success("Badge deleted!");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Reward mutations
  const saveRewardMutation = useMutation({
    mutationFn: async (data: typeof rewardForm & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from("agent_rewards")
          .update(data)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("agent_rewards").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-rewards"] });
      toast.success(editingReward ? "Reward updated!" : "Reward created!");
      setRewardDialogOpen(false);
      resetRewardForm();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteRewardMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("agent_rewards").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-rewards"] });
      toast.success("Reward deleted!");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Form reset functions
  const resetChallengeForm = () => {
    setEditingChallenge(null);
    setChallengeForm({
      title: "",
      description: "",
      reward_type: "cash",
      reward_value: "",
      target_type: "sales",
      target_value: 1,
      start_date: "",
      end_date: "",
      is_active: true,
    });
  };

  const resetBadgeForm = () => {
    setEditingBadge(null);
    setBadgeForm({
      name: "",
      description: "",
      icon: "award",
      requirement_type: "sales_count",
      requirement_value: 1,
      points_reward: 100,
    });
  };

  const resetRewardForm = () => {
    setEditingReward(null);
    setRewardForm({
      name: "",
      description: "",
      category: "merchandise",
      points_cost: 100,
      stock: null,
      image_url: "",
      is_active: true,
    });
  };

  // Edit handlers
  const openEditChallenge = (challenge: Challenge) => {
    setEditingChallenge(challenge);
    setChallengeForm({
      title: challenge.title,
      description: challenge.description,
      reward_type: challenge.reward_type,
      reward_value: challenge.reward_value,
      target_type: challenge.target_type,
      target_value: challenge.target_value,
      start_date: challenge.start_date,
      end_date: challenge.end_date,
      is_active: challenge.is_active,
    });
    setChallengeDialogOpen(true);
  };

  const openEditBadge = (badge: AgentBadge) => {
    setEditingBadge(badge);
    setBadgeForm({
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      requirement_type: badge.requirement_type,
      requirement_value: badge.requirement_value,
      points_reward: badge.points_reward,
    });
    setBadgeDialogOpen(true);
  };

  const openEditReward = (reward: Reward) => {
    setEditingReward(reward);
    setRewardForm({
      name: reward.name,
      description: reward.description,
      category: reward.category,
      points_cost: reward.points_cost,
      stock: reward.stock,
      image_url: reward.image_url || "",
      is_active: reward.is_active,
    });
    setRewardDialogOpen(true);
  };

  // Render icon
  const renderIcon = (iconName: string, className = "h-5 w-5") => {
    const IconComponent = iconMap[iconName] || Award;
    return <IconComponent className={className} />;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Trophy className="h-8 w-8 text-primary" />
          Gamification
        </h1>
        <p className="text-muted-foreground">
          Kelola challenges, badges, dan rewards untuk agent
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="challenges" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Challenges
          </TabsTrigger>
          <TabsTrigger value="badges" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            Badges
          </TabsTrigger>
          <TabsTrigger value="rewards" className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Rewards
          </TabsTrigger>
        </TabsList>

        {/* CHALLENGES TAB */}
        <TabsContent value="challenges" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Challenges</h2>
              <p className="text-sm text-muted-foreground">Tantangan bulanan untuk agent</p>
            </div>
            <Dialog open={challengeDialogOpen} onOpenChange={setChallengeDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetChallengeForm}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Challenge
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingChallenge ? "Edit" : "Add"} Challenge</DialogTitle>
                  <DialogDescription>
                    Buat tantangan baru untuk memotivasi agent
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={challengeForm.title}
                      onChange={(e) => setChallengeForm({ ...challengeForm, title: e.target.value })}
                      placeholder="e.g., First Sale of 2025"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={challengeForm.description}
                      onChange={(e) => setChallengeForm({ ...challengeForm, description: e.target.value })}
                      placeholder="Deskripsi challenge..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Target Type</Label>
                      <Select
                        value={challengeForm.target_type}
                        onValueChange={(val) => setChallengeForm({ ...challengeForm, target_type: val })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sales">Sales</SelectItem>
                          <SelectItem value="referrals">Referrals</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Target Value</Label>
                      <Input
                        type="number"
                        min={1}
                        value={challengeForm.target_value || ""}
                        onChange={(e) => setChallengeForm({ ...challengeForm, target_value: e.target.value ? parseInt(e.target.value) : 1 })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Reward Type</Label>
                      <Select
                        value={challengeForm.reward_type}
                        onValueChange={(val) => setChallengeForm({ ...challengeForm, reward_type: val })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="points">Points</SelectItem>
                          <SelectItem value="badge">Badge</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Reward Value</Label>
                      <Input
                        value={challengeForm.reward_value}
                        onChange={(e) => setChallengeForm({ ...challengeForm, reward_value: e.target.value })}
                        placeholder={challengeForm.reward_type === "cash" ? "500000" : "100"}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={challengeForm.start_date}
                        onChange={(e) => setChallengeForm({ ...challengeForm, start_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={challengeForm.end_date}
                        onChange={(e) => setChallengeForm({ ...challengeForm, end_date: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={challengeForm.is_active}
                      onCheckedChange={(checked) => setChallengeForm({ ...challengeForm, is_active: checked })}
                    />
                    <Label>Active</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => saveChallengeMutation.mutate(
                      editingChallenge
                        ? { ...challengeForm, id: editingChallenge.id }
                        : challengeForm
                    )}
                    disabled={saveChallengeMutation.isPending}
                  >
                    {saveChallengeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              {loadingChallenges ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Challenge</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Reward</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {challenges.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Belum ada challenge
                        </TableCell>
                      </TableRow>
                    ) : (
                      challenges.map((challenge) => (
                        <TableRow key={challenge.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{challenge.title}</p>
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {challenge.description}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {challenge.target_value} {challenge.target_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {challenge.reward_type === "cash" && <DollarSign className="h-4 w-4" />}
                              {challenge.reward_type === "points" && <Star className="h-4 w-4" />}
                              {challenge.reward_type === "badge" && <Award className="h-4 w-4" />}
                              <span>{challenge.reward_value}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>{formatDate(challenge.start_date)}</p>
                              <p className="text-muted-foreground">to {formatDate(challenge.end_date)}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={challenge.is_active ? "default" : "secondary"}>
                              {challenge.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => openEditChallenge(challenge)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm("Delete this challenge?")) {
                                  deleteChallengeMutation.mutate(challenge.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* BADGES TAB */}
        <TabsContent value="badges" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Badges</h2>
              <p className="text-sm text-muted-foreground">Achievement badges untuk agent</p>
            </div>
            <Dialog open={badgeDialogOpen} onOpenChange={setBadgeDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetBadgeForm}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Badge
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingBadge ? "Edit" : "Add"} Badge</DialogTitle>
                  <DialogDescription>
                    Buat badge achievement baru
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={badgeForm.name}
                      onChange={(e) => setBadgeForm({ ...badgeForm, name: e.target.value })}
                      placeholder="e.g., First Sale"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={badgeForm.description}
                      onChange={(e) => setBadgeForm({ ...badgeForm, description: e.target.value })}
                      placeholder="Deskripsi badge..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Icon</Label>
                    <Select
                      value={badgeForm.icon}
                      onValueChange={(val) => setBadgeForm({ ...badgeForm, icon: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {iconOptions.map((icon) => (
                          <SelectItem key={icon} value={icon}>
                            <div className="flex items-center gap-2">
                              {renderIcon(icon, "h-4 w-4")}
                              <span className="capitalize">{icon}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Requirement Type</Label>
                      <Select
                        value={badgeForm.requirement_type}
                        onValueChange={(val) => setBadgeForm({ ...badgeForm, requirement_type: val })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sales_count">Sales Count</SelectItem>
                          <SelectItem value="referrals">Referrals</SelectItem>
                          <SelectItem value="streak">Streak</SelectItem>
                          <SelectItem value="first_sale">First Sale</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Requirement Value</Label>
                      <Input
                        type="number"
                        min={1}
                        value={badgeForm.requirement_value || ""}
                        onChange={(e) => setBadgeForm({ ...badgeForm, requirement_value: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Points Reward</Label>
                    <Input
                      type="number"
                      min={0}
                      value={badgeForm.points_reward || ""}
                      onChange={(e) => setBadgeForm({ ...badgeForm, points_reward: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => saveBadgeMutation.mutate(
                      editingBadge
                        ? { ...badgeForm, id: editingBadge.id }
                        : badgeForm
                    )}
                    disabled={saveBadgeMutation.isPending}
                  >
                    {saveBadgeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              {loadingBadges ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Badge</TableHead>
                      <TableHead>Requirement</TableHead>
                      <TableHead>Points Reward</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {badges.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          Belum ada badge
                        </TableCell>
                      </TableRow>
                    ) : (
                      badges.map((badge) => (
                        <TableRow key={badge.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                {renderIcon(badge.icon)}
                              </div>
                              <div>
                                <p className="font-medium">{badge.name}</p>
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                  {badge.description}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {badge.requirement_value} {badge.requirement_type.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-500" />
                              <span>{badge.points_reward} pts</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => openEditBadge(badge)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm("Delete this badge?")) {
                                  deleteBadgeMutation.mutate(badge.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* REWARDS TAB */}
        <TabsContent value="rewards" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Rewards Store</h2>
              <p className="text-sm text-muted-foreground">Hadiah yang bisa ditukar dengan poin</p>
            </div>
            <Dialog open={rewardDialogOpen} onOpenChange={setRewardDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetRewardForm}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Reward
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingReward ? "Edit" : "Add"} Reward</DialogTitle>
                  <DialogDescription>
                    Tambah item reward baru ke store
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={rewardForm.name}
                      onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })}
                      placeholder="e.g., Kaos Exclusive"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={rewardForm.description}
                      onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })}
                      placeholder="Deskripsi reward..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select
                        value={rewardForm.category}
                        onValueChange={(val) => setRewardForm({ ...rewardForm, category: val })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="merchandise">Merchandise</SelectItem>
                          <SelectItem value="cash">Cash Bonus</SelectItem>
                          <SelectItem value="training">Training</SelectItem>
                          <SelectItem value="travel">Travel Perks</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Points Cost</Label>
                      <Input
                        type="number"
                        min={1}
                        value={rewardForm.points_cost || ""}
                        onChange={(e) => setRewardForm({ ...rewardForm, points_cost: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Stock (kosongkan jika unlimited)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={rewardForm.stock ?? ""}
                        onChange={(e) => setRewardForm({
                          ...rewardForm,
                          stock: e.target.value ? parseInt(e.target.value) : null
                        })}
                        placeholder="Unlimited"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Image URL (optional)</Label>
                      <Input
                        value={rewardForm.image_url}
                        onChange={(e) => setRewardForm({ ...rewardForm, image_url: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rewardForm.is_active}
                      onCheckedChange={(checked) => setRewardForm({ ...rewardForm, is_active: checked })}
                    />
                    <Label>Active</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => saveRewardMutation.mutate(
                      editingReward
                        ? { ...rewardForm, id: editingReward.id }
                        : rewardForm
                    )}
                    disabled={saveRewardMutation.isPending}
                  >
                    {saveRewardMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              {loadingRewards ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reward</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rewards.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Belum ada reward
                        </TableCell>
                      </TableRow>
                    ) : (
                      rewards.map((reward) => (
                        <TableRow key={reward.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-accent rounded-lg">
                                <Gift className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="font-medium">{reward.name}</p>
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                  {reward.description}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {reward.category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-500" />
                              <span>{reward.points_cost} pts</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {reward.stock !== null ? reward.stock : "∞"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={reward.is_active ? "default" : "secondary"}>
                              {reward.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => openEditReward(reward)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm("Delete this reward?")) {
                                  deleteRewardMutation.mutate(reward.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Gamification;
