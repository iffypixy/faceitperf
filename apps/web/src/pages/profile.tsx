import {HistoryHub, Profile} from "@entities/profile";
import {ContentTemplate} from "@shared/ui";

export const ProfilePage: React.FC = () => {
	return (
		<ContentTemplate>
			<div className="flex flex-col space-y-32">
				<Profile />

				<HistoryHub />
			</div>
		</ContentTemplate>
	);
};
